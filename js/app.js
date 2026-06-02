// Unified Luxury Receipt Customizer Studio - Standalone Bootstrapper
// Combines PDFGenerator and ReceiptApp in a single file to eliminate ES6 Module loading issues

// --- SECTION 1: PDF HEX TO RGB CONVERSIONS ---
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0.77, g: 0.61, b: 0.15 }; // Default gold
}

// Helper to draw a beautiful, filled/outlined rounded rectangle using solid-nested shapes (perfectly smooth, no outline wireframe leaks and 100% correct coordinate alignment)
function drawFilledRoundedRectangle(page, options) {
    const { x, y, width, height, r, color, borderColor, borderWidth } = options;
    
    // Internal helper to draw a solid filled rounded rectangle using standard rectangles and circles
    const drawSolidRoundedRect = (px, py, pw, ph, pr, fillCol) => {
        // Central horizontal rect
        page.drawRectangle({
            x: px + pr,
            y: py,
            width: pw - 2 * pr,
            height: ph,
            color: fillCol
        });
        // Central vertical rect
        page.drawRectangle({
            x: px,
            y: py + pr,
            width: pw,
            height: ph - 2 * pr,
            color: fillCol
        });
        // 4 filled corner circles of radius pr
        page.drawCircle({ x: px + pr, y: py + pr, size: pr, color: fillCol });
        page.drawCircle({ x: px + pw - pr, y: py + pr, size: pr, color: fillCol });
        page.drawCircle({ x: px + pr, y: py + ph - pr, size: pr, color: fillCol });
        page.drawCircle({ x: px + pw - pr, y: py + ph - pr, size: pr, color: fillCol });
    };

    // 1. If both border and fill are requested, use the solid nesting technique to prevent overlapping wireframes
    if (borderColor && borderWidth && color) {
        // Draw outer shape in border color
        drawSolidRoundedRect(x, y, width, height, r, borderColor);
        
        // Draw inner shape in card background color (shrunk exactly by borderWidth)
        const innerX = x + borderWidth;
        const innerY = y + borderWidth;
        const innerW = width - 2 * borderWidth;
        const innerH = height - 2 * borderWidth;
        const innerR = Math.max(0.5, r - borderWidth);
        drawSolidRoundedRect(innerX, innerY, innerW, innerH, innerR, color);
    } 
    // 2. If only fill is requested
    else if (color) {
        drawSolidRoundedRect(x, y, width, height, r, color);
    }
    // 3. If only border is requested (unfilled)
    else if (borderColor && borderWidth) {
        // Draw outer outline border using standard lines
        page.drawLine({ start: { x: x + r, y: y }, end: { x: x + width - r, y: y }, color: borderColor, thickness: borderWidth });
        page.drawLine({ start: { x: x + r, y: y + height }, end: { x: x + width - r, y: y + height }, color: borderColor, thickness: borderWidth });
        page.drawLine({ start: { x: x, y: y + r }, end: { x: x, y: y + height - r }, color: borderColor, thickness: borderWidth });
        page.drawLine({ start: { x: x + width, y: y + r }, end: { x: x + width, y: y + height - r }, color: borderColor, thickness: borderWidth });

        // Draw small outlined corner circles
        page.drawCircle({ x: x + r, y: y + r, size: r, borderColor: borderColor, borderWidth: borderWidth });
        page.drawCircle({ x: x + width - r, y: y + r, size: r, borderColor: borderColor, borderWidth: borderWidth });
        page.drawCircle({ x: x + r, y: y + height - r, size: r, borderColor: borderColor, borderWidth: borderWidth });
        page.drawCircle({ x: x + width - r, y: y + height - r, size: r, borderColor: borderColor, borderWidth: borderWidth });
    }
}

// --- SECTION 2: VECTOR PDF GENERATOR ENGINE ---
class PDFGenerator {
    constructor() {}

    async buildLuxuryReceipt(data) {
        const { PDFDocument, rgb, PDFName, PDFString } = PDFLib;
        
        // 1. Create Document & Set standard A4 Layout (595 x 842 points)
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);

        const isDark = data.theme === 'dark';
        
        // 2. Define Theme Color Schemes dynamically
        const pageBg = isDark ? rgb(0.07, 0.07, 0.07) : rgb(1, 1, 1);
        const cardBg = isDark ? rgb(0.10, 0.10, 0.10) : rgb(0.985, 0.982, 0.975); // Greeting card background (beige)
        const whiteCardBg = isDark ? rgb(0.10, 0.10, 0.10) : rgb(1, 1, 1); // White card background
        const innerCardBg = isDark ? rgb(0.14, 0.14, 0.14) : rgb(1, 1, 1);
        const borderSoft = isDark ? rgb(0.16, 0.16, 0.16) : rgb(0.92, 0.89, 0.83);
        const iconBoxBg = isDark ? rgb(0.20, 0.17, 0.08) : rgb(0.99, 0.83, 0.30); // Bright gold/yellow icon box
        
        const charcoal = isDark ? rgb(1, 1, 1) : rgb(0.17, 0.17, 0.17);
        const muted = isDark ? rgb(0.55, 0.55, 0.55) : rgb(0.42, 0.42, 0.42);
        const white = rgb(1, 1, 1);
        const gold = rgb(hexToRgb(data.accentColor).r, hexToRgb(data.accentColor).g, hexToRgb(data.accentColor).b);
        
        // Fill full dark background if dark theme
        if (isDark) {
            page.drawRectangle({
                x: 0,
                y: 0,
                width: 595,
                height: 842,
                color: pageBg
            });
        }
        
        // 3. Embed Standard PDF Fonts
        const helvetica = await pdfDoc.embedFont('Helvetica');
        const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');
        const times = await pdfDoc.embedFont('Times-Roman');
        const timesBold = await pdfDoc.embedFont('Times-Bold');
        
        // Spaced Text Helpers
        const drawTextSpaced = (text, x, y, fontSize, font, color, letterSpacing = 0) => {
            let currentX = x;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                page.drawText(char, { x: currentX, y, size: fontSize, font, color });
                const charWidth = font.widthOfTextAtSize(char, fontSize);
                currentX += charWidth + letterSpacing;
            }
        };
        
        const widthOfTextSpaced = (text, fontSize, font, letterSpacing = 0) => {
            let totalWidth = 0;
            for (let i = 0; i < text.length; i++) {
                totalWidth += font.widthOfTextAtSize(text[i], fontSize);
                if (i < text.length - 1) {
                    totalWidth += letterSpacing;
                }
            }
            return totalWidth;
        };
        
        const drawCenteredTextSpaced = (text, y, fontSize, font, color, letterSpacing = 0) => {
            const textWidth = widthOfTextSpaced(text, fontSize, font, letterSpacing);
            const x = (595 - textWidth) / 2;
            drawTextSpaced(text, x, y, fontSize, font, color, letterSpacing);
        };
        
        // Wrapped Text Center Helper
        const drawWrappedTextCentered = (text, y, fontSize, font, color, maxW, lineSpacing = 14) => {
            const words = text.split(' ');
            let lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const width = font.widthOfTextAtSize(testLine, fontSize);
                if (width > maxW) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            
            let curY = y;
            for (const line of lines) {
                drawCenteredTextSpaced(line, curY, fontSize, font, color, 0);
                curY -= lineSpacing;
            }
            return curY;
        };

        // Left-Aligned Wrapped Text Helper
        const drawWrappedTextLeft = (text, x, y, fontSize, font, color, maxW, lineSpacing = 10) => {
            const words = text.split(' ');
            let lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const width = font.widthOfTextAtSize(testLine, fontSize);
                if (width > maxW) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            
            let curY = y;
            for (const line of lines) {
                page.drawText(line, { x, y: curY, size: fontSize, font, color });
                curY -= lineSpacing;
            }
            return curY;
        };

        // Step Number Badge Helper
        const drawStepNumber = (num, cx, cy, r, color) => {
            page.drawCircle({ x: cx, y: cy, size: r, color });
            const numStr = String(num);
            const numFontSize = 8;
            const textWidth = helveticaBold.widthOfTextAtSize(numStr, numFontSize);
            const tx = cx - textWidth / 2;
            const ty = cy - numFontSize / 2 + 1;
            page.drawText(numStr, { x: tx, y: ty, size: numFontSize, font: helveticaBold, color: white });
        };

        // Centered Pill Badge Helper
        const drawPill = (x, y, width, height, iconType, text) => {
            drawFilledRoundedRectangle(page, {
                x, y, width, height,
                r: height / 2,
                color: innerCardBg,
                borderColor: gold,
                borderWidth: 1
            });

            const font = helveticaBold;
            const fontSize = 6.5;
            const textWidth = widthOfTextSpaced(text, fontSize, font, 0.5);
            
            const iconW = 10;
            const gap = 5;
            const totalContentW = iconW + gap + textWidth;
            
            const startX = x + (width - totalContentW) / 2;
            const iconX = startX;
            const iconY = y + (height - 8) / 2;
            
            const textX = startX + iconW + gap;
            const textY = y + (height - fontSize) / 2 + 1;
            
            if (iconType === 'link') {
                drawFilledRoundedRectangle(page, { x: iconX, y: iconY + 1, width: 6, height: 5, r: 1.5, borderColor: gold, borderWidth: 1.2 });
                drawFilledRoundedRectangle(page, { x: iconX + 4, y: iconY + 1, width: 6, height: 5, r: 1.5, borderColor: gold, borderWidth: 1.2 });
                page.drawLine({ start: { x: iconX + 3, y: iconY + 3.5 }, end: { x: iconX + 7, y: iconY + 3.5 }, color: gold, thickness: 1.2 });
            } else if (iconType === 'support') {
                drawFilledRoundedRectangle(page, { x: iconX, y: iconY + 1.5, width: 11, height: 7, r: 2, borderColor: gold, borderWidth: 1.2 });
                page.drawLine({ start: { x: iconX + 3, y: iconY + 1.5 }, end: { x: iconX + 1, y: iconY - 1 }, color: gold, thickness: 1.2 });
                page.drawLine({ start: { x: iconX + 1, y: iconY - 1 }, end: { x: iconX + 6, y: iconY + 1.5 }, color: gold, thickness: 1.2 });
            }
            
            drawTextSpaced(text, textX, textY, fontSize, font, gold, 0.5);
        };

        // --- DRAW VECTORS ---

        // A. Outer double gold borders
        // Outer thin frame
        page.drawRectangle({
            x: 15,
            y: 15,
            width: 565,
            height: 812,
            borderColor: gold,
            borderWidth: 1.5,
            color: undefined
        });

        // Inner thin line
        page.drawRectangle({
            x: 19,
            y: 19,
            width: 557,
            height: 804,
            borderColor: gold,
            borderWidth: 1.5,
            color: undefined
        });

        // B. Brand Header Section
        drawCenteredTextSpaced(data.shopTitle, 765, 18, timesBold, charcoal, 2.5);
        drawCenteredTextSpaced(data.shopSubtitle, 750, 7, helveticaBold, muted, 3.5);

        // C. Main Greeting Card (Y: ~485 to 715)
        // Background rounded rectangle (r=8)
        drawFilledRoundedRectangle(page, {
            x: 45,
            y: 485,
            width: 505,
            height: 230,
            r: 8,
            color: cardBg,
            borderColor: borderSoft,
            borderWidth: 1
        });

        // Gift icon border (rounded corners r=8)
        drawFilledRoundedRectangle(page, {
            x: 275,
            y: 660,
            width: 44,
            height: 44,
            r: 8,
            color: innerCardBg,
            borderColor: gold,
            borderWidth: 1
        });
        
        // Draw decorative vector gift package and beautiful ribbon bow loops on top
        drawFilledRoundedRectangle(page, {
            x: 287,
            y: 668,
            width: 20,
            height: 20,
            r: 2,
            borderColor: gold,
            borderWidth: 1.5
        });
        // Horizontal ribbon line
        page.drawLine({
            start: { x: 287, y: 678 },
            end: { x: 307, y: 678 },
            color: gold,
            thickness: 2
        });
        // Vertical ribbon line
        page.drawLine({
            start: { x: 297, y: 668 },
            end: { x: 297, y: 688 },
            color: gold,
            thickness: 2
        });
        // Elegant ribbon loops on top
        page.drawCircle({ x: 293, y: 690, size: 3.5, borderColor: gold, borderWidth: 1.5 });
        page.drawCircle({ x: 301, y: 690, size: 3.5, borderColor: gold, borderWidth: 1.5 });

        // Card Texts
        drawCenteredTextSpaced(data.mainBadge, 635, 6, helveticaBold, gold, 2);
        drawCenteredTextSpaced(data.mainTitle, 610, 15, timesBold, charcoal, 0.5);
        
        // Multi-line wrapped main body greeting
        drawWrappedTextCentered(data.mainBody, 580, 8.5, helvetica, charcoal, 420, 13);

        // Badges Row using the beautiful dynamically centered drawPill helper
        drawPill(95, 505, 190, 22, 'link', data.badgePill1);
        drawPill(310, 505, 190, 22, 'support', data.badgePill2);

        // D. Download Link Box Card (Y: ~335 to 430)
        // Header label
        drawTextSpaced(data.sectionLabel, 45, 440, 6.5, helveticaBold, gold, 1.5);
        
        // Card Box (Slightly taller with rounded corners r=8, crisp WHITE background)
        drawFilledRoundedRectangle(page, {
            x: 45,
            y: 335,
            width: 505,
            height: 95,
            r: 8,
            color: whiteCardBg,
            borderColor: borderSoft,
            borderWidth: 1
        });
        
        // Solid left gold border stripe (Thicker 6pt, beautifully rounded)
        drawFilledRoundedRectangle(page, {
            x: 45,
            y: 335,
            width: 6,
            height: 95,
            r: 3,
            color: gold
        });

        // Palette icon card box (Bright yellow background, rounded r=8)
        drawFilledRoundedRectangle(page, {
            x: 65,
            y: 360,
            width: 44,
            height: 44,
            r: 8,
            color: iconBoxBg
        });
        
        // Beautiful Paint Palette Vector Drawing inside the box (Drawn in solid dark charcoal with gold cutout thumb-hole)
        const paletteDrawColor = rgb(0.1, 0.1, 0.1);
        
        // Beautiful outlined paint palette body
        page.drawCircle({
            x: 87,
            y: 382,
            size: 9,
            borderColor: paletteDrawColor,
            borderWidth: 1.5
        });
        // Organic palette "bite" cutout filled with background yellow-gold color
        page.drawCircle({
            x: 92.5,
            y: 377.5,
            size: 3.5,
            color: iconBoxBg
        });
        // Outlined thumb hole
        page.drawCircle({
            x: 83,
            y: 378,
            size: 2.2,
            borderColor: paletteDrawColor,
            borderWidth: 1.2
        });
        
        // 4 elegant solid paint drops inside the palette
        page.drawCircle({ x: 88, y: 386.5, size: 1.2, color: paletteDrawColor });
        page.drawCircle({ x: 92, y: 382.5, size: 1.2, color: paletteDrawColor });
        page.drawCircle({ x: 85, y: 383, size: 1.2, color: paletteDrawColor });
        page.drawCircle({ x: 86, y: 377.5, size: 1.2, color: paletteDrawColor });

        // Item Metadata texts
        drawTextSpaced(data.itemIndex, 120, 408, 6, helveticaBold, gold, 1.5);
        
        // Dynamic sizing for item title to prevent overlap with long names
        let itemTitleText = data.itemTitle;
        let titleFontSize = 8.5;
        if (itemTitleText.length > 35) {
            titleFontSize = 7.5;
        }
        if (itemTitleText.length > 58) {
            itemTitleText = itemTitleText.substring(0, 55) + '...';
        }
        page.drawText(itemTitleText, { x: 120, y: 394, size: titleFontSize, font: helveticaBold, color: charcoal });
        
        page.drawText(data.itemSubtext, { x: 120, y: 382, size: 6.5, font: helvetica, color: muted });

        // --- BUTTONS & CLICKABLE LINKS ---
        
        // DOWNLOAD NOW BUTTON (Stacked vertically under metadata, X: 120, rounded corners r=6)
        const btnW = 120;
        const btnH = 24;
        const btnX = 120;
        const btnY = 347;
        
        const textFont = helveticaBold;
        const textFontSize = 7.5;
        const textWidth = textFont.widthOfTextAtSize(data.downloadBtnText, textFontSize);
        const iconWidth = 10;
        const gap = 5;
        const totalW = iconWidth + gap + textWidth;
        const contentX = btnX + (btnW - totalW) / 2;
        const contentY = btnY + (btnH - textFontSize) / 2 + 0.5;
        
        // Draw filled button
        drawFilledRoundedRectangle(page, {
            x: btnX,
            y: btnY,
            width: btnW,
            height: btnH,
            r: 6,
            color: gold
        });
        
        // Draw custom vector download icon
        const iconStartX = contentX;
        const iconStartY = btnY + (btnH - 10) / 2;
        
        page.drawLine({ start: { x: iconStartX + 5, y: iconStartY + 9 }, end: { x: iconStartX + 5, y: iconStartY + 2.5 }, color: white, thickness: 1.2 });
        page.drawLine({ start: { x: iconStartX + 2.5, y: iconStartY + 5 }, end: { x: iconStartX + 5, y: iconStartY + 2.5 }, color: white, thickness: 1.2 });
        page.drawLine({ start: { x: iconStartX + 7.5, y: iconStartY + 5 }, end: { x: iconStartX + 5, y: iconStartY + 2.5 }, color: white, thickness: 1.2 });
        page.drawLine({ start: { x: iconStartX + 1.5, y: iconStartY }, end: { x: iconStartX + 8.5, y: iconStartY }, color: white, thickness: 1.2 });
        
        // Draw text
        page.drawText(data.downloadBtnText, {
            x: contentX + iconWidth + gap,
            y: contentY,
            size: textFontSize,
            font: textFont,
            color: white
        });

        // Native PDF Clickable URI Link Annotation (Mapped to button coordinates)
        const downloadLink = pdfDoc.context.register(
            pdfDoc.context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Link'),
                Rect: pdfDoc.context.obj([120, 347, 240, 371]),
                Border: pdfDoc.context.obj([0, 0, 0]),
                A: pdfDoc.context.obj({
                    Type: PDFName.of('Action'),
                    S: PDFName.of('URI'),
                    URI: PDFString.of(data.downloadUrl)
                })
            })
        );

        // E. Instructions Card (Y: ~125 to 320, crisp WHITE background)
        drawFilledRoundedRectangle(page, {
            x: 45,
            y: 125,
            width: 505,
            height: 195,
            r: 8,
            color: whiteCardBg,
            borderColor: borderSoft,
            borderWidth: 1
        });
        
        // Header
        drawTextSpaced(data.instTitle, 65, 295, 6.5, helveticaBold, gold, 1.5);

        // Step 1
        drawStepNumber(1, 75, 257, 10, gold);
        page.drawText(data.step1Title, { x: 95, y: 258, size: 7.5, font: helveticaBold, color: charcoal });
        drawWrappedTextLeft(data.step1Body, 95, 246, 6.5, helvetica, muted, 420, 10);

        // Step 2
        drawStepNumber(2, 75, 207, 10, gold);
        page.drawText(data.step2Title, { x: 95, y: 208, size: 7.5, font: helveticaBold, color: charcoal });
        drawWrappedTextLeft(data.step2Body, 95, 196, 6.5, helvetica, muted, 420, 10);

        // Step 3
        drawStepNumber(3, 75, 157, 10, gold);
        page.drawText(data.step3Title, { x: 95, y: 158, size: 7.5, font: helveticaBold, color: charcoal });
        drawWrappedTextLeft(data.step3Body, 95, 146, 6.5, helvetica, muted, 420, 10);

        // G. Footer Section (Y: ~40 to 100)
        page.drawLine({
            start: { x: 45, y: 100 },
            end: { x: 550, y: 100 },
            color: borderSoft,
            thickness: 1
        });

        // Brand details left
        page.drawText(data.footerShopTitle, { x: 45, y: 75, size: 9, font: timesBold, color: charcoal });
        page.drawText(data.footerShopUrl, { x: 45, y: 61, size: 6.5, font: helvetica, color: muted });

        // Rating Stars right
        page.drawText('5 STAR RATED STORE', { x: 440, y: 75, size: 6.5, font: helveticaBold, color: gold });

        // LEAVE A REVIEW BUTTON (with rounded corners r=5)
        drawFilledRoundedRectangle(page, {
            x: 435,
            y: 47,
            width: 100,
            height: 20,
            r: 5,
            color: charcoal
        });
        page.drawText(data.reviewBtnText, { x: 452, y: 54, size: 5.5, font: helveticaBold, color: white });

        // Native PDF Clickable Review link
        const reviewLink = pdfDoc.context.register(
            pdfDoc.context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Link'),
                Rect: pdfDoc.context.obj([435, 47, 535, 67]),
                Border: pdfDoc.context.obj([0, 0, 0]),
                A: pdfDoc.context.obj({
                    Type: PDFName.of('Action'),
                    S: PDFName.of('URI'),
                    URI: PDFString.of(data.reviewUrl)
                })
            })
        );

        // 5. Connect both active link annotations to A4 page
        page.node.set(
            PDFName.of('Annots'),
            pdfDoc.context.obj([downloadLink, reviewLink])
        );

        // 6. Save and compile binary array
        return await pdfDoc.save();
    }
}

// --- SECTION 3: CORE COORDINATOR APPS ---
class ReceiptApp {
    constructor() {
        this.generator = new PDFGenerator();
        this.initEventListeners();
        this.syncAllPreview();
    }

    initEventListeners() {
        // A. Inputs Synced in Real Time
        const mappings = [
            { input: 'inpShopTitle', preview: 'prevShopTitle', action: 'text' },
            { input: 'inpShopSubtitle', preview: 'prevShopSubtitle', action: 'text' },
            { input: 'inpMainBadge', preview: 'prevMainBadge', action: 'text' },
            { input: 'inpMainTitle', preview: 'prevMainTitle', action: 'text' },
            { input: 'inpMainBody', preview: 'prevMainBody', action: 'text' },
            { input: 'inpBadgePill1', preview: 'prevBadgePill1', action: 'text' },
            { input: 'inpBadgePill2', preview: 'prevBadgePill2', action: 'text' },
            { input: 'inpSectionLabel', preview: 'prevSectionLabel', action: 'text' },
            { input: 'inpItemIndex', preview: 'prevItemIndex', action: 'text' },
            { input: 'inpItemTitle', preview: 'prevItemTitle', action: 'text' },
            { input: 'inpItemSubtext', preview: 'prevItemSubtext', action: 'text' },
            { input: 'inpDownloadBtnText', preview: 'prevDownloadBtnText', action: 'text' },
            
            // Clicking Link href previews
            { input: 'inpDownloadUrl', preview: 'prevDownloadBtn', action: 'href' },
            
            // Steps
            { input: 'inpInstTitle', preview: 'prevInstTitle', action: 'text' },
            { input: 'inpStep1Title', preview: 'prevStep1Title', action: 'text' },
            { input: 'inpStep1Body', preview: 'prevStep1Body', action: 'text' },
            { input: 'inpStep2Title', preview: 'prevStep2Title', action: 'text' },
            { input: 'inpStep2Body', preview: 'prevStep2Body', action: 'text' },
            { input: 'inpStep3Title', preview: 'prevStep3Title', action: 'text' },
            { input: 'inpStep3Body', preview: 'prevStep3Body', action: 'text' },
            
            // Footer
            { input: 'inpFooterShopTitle', preview: 'prevFooterShopTitle', action: 'text' },
            { input: 'inpFooterShopUrl', preview: 'prevFooterShopUrl', action: 'text_and_href' },
            { input: 'inpReviewBtnText', preview: 'prevReviewBtnText', action: 'text' },
            { input: 'inpReviewUrl', preview: 'prevReviewBtn', action: 'href' }
        ];

        mappings.forEach(m => {
            const inputEl = document.getElementById(m.input);
            const previewEl = document.getElementById(m.preview);
            
            if (inputEl && previewEl) {
                inputEl.addEventListener('input', () => {
                    const value = inputEl.value;
                    if (m.action === 'text') {
                        previewEl.innerText = value;
                    } 
                    else if (m.action === 'href') {
                        previewEl.href = value || '#';
                    } 
                    else if (m.action === 'text_and_href') {
                        previewEl.innerText = value;
                        previewEl.href = value || '#';
                    }
                });
            }
        });

        // B. Accent Color Sync (Updates CSS variables of both preview & label)
        const colorInp = document.getElementById('inpAccentColor');
        if (colorInp) {
            colorInp.addEventListener('input', (e) => {
                const hexColor = e.target.value;
                const label = document.querySelector('.color-val-label');
                if (label) label.innerText = hexColor;
                
                const receipt = document.getElementById('receiptContainer');
                if (receipt) receipt.style.setProperty('--rc-gold', hexColor);
            });
        }

        // C. Rating Stars Sync
        const starsSelect = document.getElementById('inpRatingStars');
        if (starsSelect) {
            starsSelect.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                const starsContainer = document.getElementById('prevRatingStars');
                if (starsContainer) {
                    starsContainer.innerHTML = '';
                    for (let i = 0; i < 5; i++) {
                        const starIcon = document.createElement('i');
                        starIcon.dataset.lucide = 'star';
                        if (i < val) {
                            starIcon.className = 'fill-star';
                        }
                        starsContainer.appendChild(starIcon);
                    }
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        }

        // D. PDF Compilation Trigger
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.handlePDFCompile());
        }

        // E. Close Error Card Overlay Trigger
        const errorCloseBtn = document.getElementById('loaderErrorCloseBtn');
        if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', () => {
                document.getElementById('loaderOverlay').classList.add('hidden');
            });
        }

        // F. Theme Selector Binds
        this.selectedTheme = 'light';
        const btnLight = document.getElementById('themeBtnLight');
        const btnDark = document.getElementById('themeBtnDark');
        const container = document.getElementById('receiptContainer');

        if (btnLight && btnDark && container) {
            btnLight.addEventListener('click', () => {
                this.selectedTheme = 'light';
                btnLight.classList.add('active');
                btnDark.classList.remove('active');
                container.classList.remove('theme-black');
            });

            btnDark.addEventListener('click', () => {
                this.selectedTheme = 'dark';
                btnDark.classList.add('active');
                btnLight.classList.remove('active');
                container.classList.add('theme-black');
            });
        }

        // Initialize icons rendered initially
        if (window.lucide) window.lucide.createIcons();
    }

    // Trigger preview synchronizer on load (to pop standard values)
    syncAllPreview() {
        const triggerInput = (id) => {
            const el = document.getElementById(id);
            if (el) el.dispatchEvent(new Event('input'));
        };
        const triggerChange = (id) => {
            const el = document.getElementById(id);
            if (el) el.dispatchEvent(new Event('change'));
        };

        triggerInput('inpShopTitle');
        triggerInput('inpShopSubtitle');
        triggerInput('inpMainBadge');
        triggerInput('inpMainTitle');
        triggerInput('inpMainBody');
        triggerInput('inpBadgePill1');
        triggerInput('inpBadgePill2');
        triggerInput('inpSectionLabel');
        triggerInput('inpItemIndex');
        triggerInput('inpItemTitle');
        triggerInput('inpItemSubtext');
        triggerInput('inpDownloadBtnText');
        triggerInput('inpDownloadUrl');
        
        // steps
        triggerInput('inpInstTitle');
        triggerInput('inpStep1Title');
        triggerInput('inpStep1Body');
        triggerInput('inpStep2Title');
        triggerInput('inpStep2Body');
        triggerInput('inpStep3Title');
        triggerInput('inpStep3Body');
        
        // footer
        triggerInput('inpFooterShopTitle');
        triggerInput('inpFooterShopUrl');
        triggerInput('inpReviewBtnText');
        triggerInput('inpReviewUrl');
        
        // trigger color and stars
        triggerInput('inpAccentColor');
        triggerChange('inpRatingStars');
    }

    // Compile A4 receipt PDF
    async handlePDFCompile() {
        const loader = document.getElementById('loaderOverlay');
        const normalContent = document.getElementById('loaderNormalContent');
        const errorCard = document.getElementById('loaderErrorCard');
        
        if (loader && normalContent && errorCard) {
            errorCard.classList.add('hidden');
            normalContent.classList.remove('hidden');
            loader.classList.remove('hidden');
        }

        // Capture all input fields config
        const config = {
            theme: this.selectedTheme,
            shopTitle: document.getElementById('inpShopTitle').value,
            shopSubtitle: document.getElementById('inpShopSubtitle').value,
            accentColor: document.getElementById('inpAccentColor').value,
            mainBadge: document.getElementById('inpMainBadge').value,
            mainTitle: document.getElementById('inpMainTitle').value,
            mainBody: document.getElementById('inpMainBody').value,
            badgePill1: document.getElementById('inpBadgePill1').value,
            badgePill2: document.getElementById('inpBadgePill2').value,
            sectionLabel: document.getElementById('inpSectionLabel').value,
            itemIndex: document.getElementById('inpItemIndex').value,
            itemTitle: document.getElementById('inpItemTitle').value,
            itemSubtext: document.getElementById('inpItemSubtext').value,
            downloadBtnText: document.getElementById('inpDownloadBtnText').value,
            downloadUrl: document.getElementById('inpDownloadUrl').value,
            instTitle: document.getElementById('inpInstTitle').value,
            step1Title: document.getElementById('inpStep1Title').value,
            step1Body: document.getElementById('inpStep1Body').value,
            step2Title: document.getElementById('inpStep2Title').value,
            step2Body: document.getElementById('inpStep2Body').value,
            step3Title: document.getElementById('inpStep3Title').value,
            step3Body: document.getElementById('inpStep3Body').value,
            footerShopTitle: document.getElementById('inpFooterShopTitle').value,
            footerShopUrl: document.getElementById('inpFooterShopUrl').value,
            ratingStars: document.getElementById('inpRatingStars').value,
            reviewBtnText: document.getElementById('inpReviewBtnText').value,
            reviewUrl: document.getElementById('inpReviewUrl').value
        };

        // Delay to allow DOM repaint for loader screen
        setTimeout(async () => {
            try {
                const pdfBytes = await this.generator.buildLuxuryReceipt(config);
                
                // Trigger download in browser
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                
                const cleanFileName = config.shopTitle.trim().replace(/[^a-zA-Z0-9]/g, '_');
                link.download = `${cleanFileName}_Receipt_Rebranded.pdf`;
                
                document.body.appendChild(link);
                link.click();
                
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                
                if (loader) loader.classList.add('hidden');
            } catch (err) {
                console.error("Failed compiling receipt PDF", err);
                
                if (normalContent && errorCard) {
                    normalContent.classList.add('hidden');
                    errorCard.classList.remove('hidden');
                    const errLabel = document.getElementById('loaderErrorMessage');
                    if (errLabel) errLabel.innerText = `Error: ${err.message || err}`;
                }
            }
        }, 600);
    }
}

// Bootstrap window load
window.addEventListener('DOMContentLoaded', () => {
    window.receiptApp = new ReceiptApp();
});

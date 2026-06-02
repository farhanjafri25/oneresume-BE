import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfGeneratorService {
  private readonly htmlTemplatePath: string;
  private readonly themesCssPath: string;

  constructor() {
    this.htmlTemplatePath = path.join(__dirname, '..', '..', '..', '..', 'src', 'constants', 'resume.html');
    this.themesCssPath = path.join(__dirname, '..', '..', '..', '..', 'src', 'constants', 'themes.css');
  }

  compileHtml(themeId: string, tailoredData: any): string {
    if (!fs.existsSync(this.htmlTemplatePath)) {
      throw new InternalServerErrorException(`HTML Template file not found at: ${this.htmlTemplatePath}`);
    }
    if (!fs.existsSync(this.themesCssPath)) {
      throw new InternalServerErrorException(`Themes CSS file not found at: ${this.themesCssPath}`);
    }

    const htmlTemplate = fs.readFileSync(this.htmlTemplatePath, 'utf8');
    const themesCss = fs.readFileSync(this.themesCssPath, 'utf8');

    const themeStyles = this.extractThemeStyles(themesCss, themeId);
    const templateWithStyles = htmlTemplate.replace('{{theme_styles}}', themeStyles);

    const compiledTemplate = handlebars.compile(templateWithStyles);
    return compiledTemplate(tailoredData);
  }

  /**
   * Compiles the HTML template and selected CSS theme with Handlebars,
   * then launches a headless Puppeteer browser to print the page to a PDF Buffer.
   */
  async generateResumePdf(themeId: string, tailoredData: any): Promise<Buffer> {
    const compiledHtml = this.compileHtml(themeId, tailoredData);

    // 5. Render HTML to high-fidelity PDF with headless Puppeteer
    let browser: puppeteer.Browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    } catch (launchError: any) {
      throw new InternalServerErrorException(`Puppeteer failed to launch: ${launchError?.message || launchError}`);
    }

    try {
      const page = await browser.newPage();
      await page.setContent(compiledHtml, { waitUntil: 'load' });

      // Print page to high-quality A4 PDF with exact backgrounds
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm',
        },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (renderError: any) {
      if (browser) {
        await browser.close();
      }
      throw new InternalServerErrorException(`Puppeteer PDF rendering failed: ${renderError?.message || renderError}`);
    }
  }

  /**
   * Helper that extracts the CSS styling blocks matching the selected themeId (e.g. "theme-1").
   */
  private extractThemeStyles(cssContent: string, themeId: string): string {
    const numericIdStr = themeId.replace(/[^0-9]/g, '');
    const targetIndex = parseInt(numericIdStr, 10);

    if (isNaN(targetIndex) || targetIndex < 1) {
      throw new BadRequestException(`Invalid theme identifier: ${themeId}. Use values like theme-1 to theme-6.`);
    }

    // Split stylesheet content by headers
    const delimiter = /\/\*\s*-+\r?\n\s*THEME\s+\d+:/i;
    const blocks = cssContent.split(delimiter);

    // blocks[0] contains file header, blocks[1..N] contains theme details
    if (targetIndex >= blocks.length) {
      throw new BadRequestException(`Selected theme '${themeId}' does not exist. Available themes: 1 to ${blocks.length - 1}.`);
    }

    // The theme code is in blocks[targetIndex]. We need to strip off the remaining comments block
    const themeBlock = blocks[targetIndex];
    const endOfCommentIndex = themeBlock.indexOf('*/');
    if (endOfCommentIndex === -1) {
      return themeBlock;
    }
    return themeBlock.substring(endOfCommentIndex + 2).trim();
  }

  /**
   * Helper to retrieve list of themes metadata parsed directly from themes.css
   */
  getAvailableThemes(): Array<{ id: string; name: string; description: string; vibe: string }> {
    if (!fs.existsSync(this.themesCssPath)) {
      return [];
    }

    const cssContent = fs.readFileSync(this.themesCssPath, 'utf8');
    const delimiter = /\/\*\s*-+\r?\n\s*THEME\s+(\d+):/i;
    const parts = cssContent.split(delimiter);
    const themesList = [];

    for (let i = 1; i < parts.length; i += 2) {
      const themeNum = parts[i];
      const themeBlock = parts[i + 1] || '';

      const endOfCommentIndex = themeBlock.indexOf('*/');
      const commentText = endOfCommentIndex !== -1 ? themeBlock.substring(0, endOfCommentIndex) : '';

      // Parse metadata lines
      const lines = commentText.split('\n');
      const name = lines[0] ? lines[0].replace(/^-+/, '').trim() : `Theme ${themeNum}`;
      
      let description = '';
      let vibe = '';

      lines.forEach((line) => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('best for:')) {
          description = line.substring(line.indexOf(':') + 1).trim();
        } else if (lowerLine.includes('vibe:')) {
          vibe = line.substring(line.indexOf(':') + 1).trim();
        }
      });

      themesList.push({
        id: `theme-${themeNum}`,
        name,
        description,
        vibe,
      });
    }

    return themesList;
  }
}

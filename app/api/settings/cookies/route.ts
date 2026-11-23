import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const TMP_DIR = path.resolve(process.cwd(), '.tmp');
const CONFIG_FILE = path.join(TMP_DIR, 'cookies_config.json');
const COOKIES_TXT = path.join(TMP_DIR, 'cookies.txt');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

export async function GET() {
  ensureTmpDir();

  let browser = process.env.YTDLP_COOKIES_BROWSER || 'none';
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (parsed.browser) browser = parsed.browser;
    } catch {}
  }

  const hasCookieFile = fs.existsSync(COOKIES_TXT);
  let cookieFileSize = 0;
  if (hasCookieFile) {
    try {
      cookieFileSize = fs.statSync(COOKIES_TXT).size;
    } catch {}
  }

  return NextResponse.json({
    success: true,
    browser,
    hasCookieFile,
    cookieFileSize,
  });
}

export async function POST(req: NextRequest) {
  ensureTmpDir();

  try {
    const body = await req.json();
    const { browser, cookiesTxt } = body;

    const config: { browser?: string } = {};
    if (browser && typeof browser === 'string') {
      config.browser = browser.trim().toLowerCase();
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    if (cookiesTxt && typeof cookiesTxt === 'string') {
      fs.writeFileSync(COOKIES_TXT, cookiesTxt.trim(), 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: 'Cookie configuration updated successfully',
      browser: config.browser || 'none',
      hasCookieFile: fs.existsSync(COOKIES_TXT),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update cookie settings' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  ensureTmpDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
    if (fs.existsSync(COOKIES_TXT)) fs.unlinkSync(COOKIES_TXT);
    return NextResponse.json({ success: true, message: 'Cookie configuration reset' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


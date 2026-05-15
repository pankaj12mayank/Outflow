import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from playwright_stealth import stealth_async

from app.core.config import settings

logger = logging.getLogger(__name__)

_browser: Optional[Browser] = None
_playwright: Optional[Playwright] = None


async def get_browser() -> Browser:
    global _browser, _playwright
    if _browser is None or not _browser.is_connected():
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(
            headless=settings.playwright_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
                "--window-size=1920,1080",
            ],
        )
    return _browser


async def close_browser():
    global _browser, _playwright
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None


@asynccontextmanager
async def create_stealth_context(**kwargs) -> BrowserContext:
    browser = await get_browser()
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="en-US",
        timezone_id="America/New_York",
        extra_http_headers={
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        **kwargs,
    )

    await stealth_async(context)

    yield context

    await context.close()


@asynccontextmanager
async def create_page(context: Optional[BrowserContext] = None) -> Page:
    if context is None:
        async with create_stealth_context() as ctx:
            page = await ctx.new_page()
            yield page
    else:
        page = await context.new_page()
        yield page


class BrowserPool:
    def __init__(self, max_contexts: int = 5):
        self.max_contexts = max_contexts
        self._contexts: asyncio.Queue[BrowserContext] = asyncio.Queue()
        self._browser: Optional[Browser] = None
        self._playwright: Optional[Playwright] = None

    async def initialize(self):
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=settings.playwright_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
                "--window-size=1920,1080",
            ],
        )
        for _ in range(self.max_contexts):
            ctx = await self._browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="en-US",
            )
            await stealth_async(ctx)
            await self._contexts.put(ctx)

    async def acquire(self) -> BrowserContext:
        try:
            ctx = self._contexts.get_nowait()
            if ctx._browser is None or not ctx._browser.is_connected():
                return await self.acquire()
            return ctx
        except asyncio.QueueEmpty:
            return await self._browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="en-US",
            )

    async def release(self, context: BrowserContext):
        try:
            pages = await context.pages
            for page in pages:
                await page.close()
            await self._contexts.put(context)
        except Exception:
            await context.close()

    @asynccontextmanager
    async def page(self):
        ctx = await self.acquire()
        try:
            page = await ctx.new_page()
            yield page, ctx
        finally:
            try:
                await page.close()
            except Exception:
                pass
            await self.release(ctx)

    async def close(self):
        while not self._contexts.empty():
            try:
                ctx = self._contexts.get_nowait()
                await ctx.close()
            except Exception:
                pass
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()


_browser_pool: Optional[BrowserPool] = None


def get_browser_pool() -> BrowserPool:
    global _browser_pool
    if _browser_pool is None:
        _browser_pool = BrowserPool(max_contexts=settings.scrape_max_concurrent)
    return _browser_pool


async def install_browsers():
    import subprocess
    result = subprocess.run(
        ["playwright", "install", "chromium"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        logger.error(f"Failed to install browsers: {result.stderr}")
    else:
        logger.info("Playwright browsers installed successfully")
    return result.returncode == 0
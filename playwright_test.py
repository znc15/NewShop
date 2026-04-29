from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='screenshot.png', full_page=True)
    
    # Try to find some components to check what's missing
    print("Buttons on home page:", len(page.locator('button').all()))
    print("Links on home page:", len(page.locator('a').all()))
    
    browser.close()

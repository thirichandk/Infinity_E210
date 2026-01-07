export async function analyzeSite(page) {
  return await page.evaluate(() => {
    return {
      forms: [...document.querySelectorAll("form")].map(f => ({
        inputs: [...f.querySelectorAll("input")].map(i => i.placeholder || i.name),
        buttons: [...f.querySelectorAll("button")].map(b => b.innerText)
      })),
      buttons: [...document.querySelectorAll("button")].map(b => b.innerText),
      links: [...document.querySelectorAll("a")].map(a => a.innerText)
    };
  });
}

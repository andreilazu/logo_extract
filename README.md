### 📊 Performance & Reliability (sample run – 2026-01-29)

> ⏱️ Duration: **459.0 s**  
> Sites tested: **4,383**

#### Extraction Success Rate
```mermaid
pie title Extraction Results
    "Successful" : 3292
    "No logo found" : 728
    "Image download / hash failed" : 363
```

#### Which method actually found the logo?
```mermaid
pie title Successful Detection Methods
    "Tier 1: Fast Axios" : 3193
    "Tier 2: Puppeteer Fallback" : 99
```

> **Note:** Tier 1 = fast static parse (axios + cheerio)  
> Tier 2 = JavaScript-rendered fallback (Puppeteer)

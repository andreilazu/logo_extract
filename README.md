### 📊 Performance & Reliability (sample run – 2026-01-29)

> ⏱️ Duration: **32.4 s**  
> Sites tested: **100**

#### Extraction Success Rate
```mermaid
pie title Extraction Results
    "Successful" : 77
    "No logo found" : 15
    "Image download / hash failed" : 8
```

#### Which method actually found the logo?
```mermaid
pie title Successful Detection Methods
    "Tier 1: Fast Axios" : 74
    "Tier 2: Puppeteer Fallback" : 3
```

> **Note:** Tier 1 = fast static parse (axios + cheerio)  
> Tier 2 = JavaScript-rendered fallback (Puppeteer)

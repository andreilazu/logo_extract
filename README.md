# Logo Extract & Grouping
This repository contains a Node.js tool designed to crawl a list of websites, extract their logos, and group them based on visual similarity. It uses perceptual hashing to identify sites that share the same logo, even if the files are different. The primary output is a YAML file containing the grouped sites and a dynamically generated statistical report in the README.

## How It Works

The engine follows a multi-step process to efficiently analyze and group thousands of websites:

1.  **Input**: The process starts with a list of domains provided in `sites.csv`.
2.  **Crawling**: The script processes the websites in parallel, with a configurable concurrency limit to manage resources and avoid rate-limiting.
3.  **Logo Extraction**: For each site, it attempts to find the logo URL using a tiered approach:
    *   **Tier 1 (Metadata)**: It first checks for high-quality logo definitions like `apple-touch-icon` and `og:image`.
    *   **Tier 2 (DOM Heuristics)**: If no metadata is found, it falls back to searching the HTML for `<img>` tags with attributes like `class="logo"`, `id="logo"`, or `alt="logo"`.
4.  **Hashing**: Once a logo URL is found, the image is downloaded. Using the `sharp` library, it is converted to a standardized 9x8 grayscale image. A [Difference Hash (dHash)](https://www.hackerfactor.com/blog/index.php?/archives/529-Kind-of-Like-That.html) is then generated from these pixels. This hash represents the visual characteristics of the logo.
5.  **Grouping**: The script compares the hashes of all successful extractions using the Hamming distance. Logos with a hash distance below a defined similarity threshold are placed into the same group.
6.  **Output**: The results are saved into two main files:
    *   `groups.yaml`: Contains a detailed list of all groups, including the site URL, logo URL, and perceptual hash for each member of the group.
    *   `README.md`: A statistical report is generated and replaces the main README file, providing an overview of the latest run.

## Repository Structure

-   `index.js`: The main script that runs the entire extraction and grouping process.
-   `sites.csv`: The input file. A plain text list of website domains to be processed.
-   `groups.yaml`: The primary data output file containing the logo groups.
-   `package.json`: Lists all project dependencies.
-   `stats.js`: A helper module that generates the statistical markdown report from the `groups.yaml` data.
-   `debug.js`: A utility script to analyze websites that failed the initial extraction, providing a detailed step-by-step diagnostic log.

## Usage

### Prerequisites

-   Node.js
-   npm (Node Package Manager)

### Installation

Clone the repository and install the required dependencies:
```bash
git clone https://github.com/andreilazu/logo_extract.git
cd logo_extract
npm install
```

### Running the Extractor

1.  Populate `sites.csv` with the domains you wish to analyze, one per line.
2.  Run the main script from your terminal:

```bash
node index.js
```

The script will begin processing the sites, showing progress in the console. Upon completion, `groups.yaml` will be created/updated, and the `README.md` will be overwritten with the new statistical report.

### Debugging Failed Extractions

If some sites fail the extraction process, you can use the `debug.js` script to investigate them individually. The script automatically identifies which sites from `sites.csv` are not present in `groups.yaml` and runs a detailed analysis on them.

```bash
# Analyze the first 5 failed sites
node debug.js

# Analyze the first 20 failed sites
node debug.js 20


# 📊 Logo Grouping Statistics

## 🎯 Overview

| Metric | Value |
|--------|-------|
| **Total Sites Processed** | 4,383 |
| **Successful Logo Extractions** | 3,415 |
| **Failed Extractions** | 968 |
| **Success Rate** | 77.91% |
| **Total Groups Found** | 1,153 |
| **Groups with Duplicates** | 379 |
| **Unique Logos** | 774 |
| **Total Duplicate Instances** | 2,262 |

## 📈 Group Size Distribution

```
  1 sites │██████████████████████████████████████████████████ 774
  2 sites │███████████ 161
  3 sites │████ 57
  4 sites │███ 41
  5 sites │██ 21
  6 sites │██ 19
  7 sites │█ 14
  8 sites │█ 14
  9 sites │█ 7
 10 sites │█ 2
 11 sites │█ 3
 12 sites │█ 2
 14 sites │█ 1
 15 sites │█ 6
 16 sites │█ 1
 17 sites │█ 4
 19 sites │█ 3
 20 sites │█ 3
 21 sites │█ 1
 22 sites │█ 2
 23 sites │█ 1
 24 sites │█ 2
 26 sites │█ 1
 27 sites │█ 1
 29 sites │█ 1
 30 sites │█ 2
 31 sites │█ 1
 39 sites │█ 1
 45 sites │█ 1
 57 sites │█ 1
 78 sites │█ 1
 81 sites │█ 1
119 sites │█ 1
185 sites │█ 1
197 sites │█ 1

```

## 🏆 Top 10 Largest Duplicate Groups

### 1. Group with 197 sites

<details>
<summary>Click to expand sites</summary>

- https://mazda-autohaus-hellwig-hoyerswerda.de
- https://mazda-autohaus-kaschmieder-waren.de
- https://mazda-autohaus-lackmann-sendenhorst.de
- https://mazda-autohaus-roessel-birkenau.de
- https://mazda-autohaus-wassing-ahaus-wuellen.de
- https://mazda-autohaus-hansmann-kassel.de
- https://mazda-autohaus-sturne-rochlitz.de
- https://mazda-autohaus-blank-dinkelsbuehl.de
- https://mazda-autohaus-becker-homburg-bruchhof.de
- https://mazda-autohaus-roessel-birkenau.de
- https://mazda-autohaus-sturne-grimma.de
- https://mazda-autohaus-tabbouch-speyer.de
- https://mazda-autohaus-haese-erkrath-hochdahl.de
- https://mazda-autohaus-kilger-regen.de
- https://mazda-autohaus-banaszak-kleve.de
- https://mazda-autohaus-elstner-jena.de
- https://mazda-autohaus-dorner-riedlingen.de
- https://mazda-service-koch-ludwigsfelde.de
- https://mazda-autohaus-ludwig-halle-neustadt.de
- https://mazda-autohaus-dorner-riedlingen.de
- https://mazda-autohaus-buelo-naumburg.de
- https://mazda-autohaus-thoss-falkenstein.de
- https://mazda-autohaus-lotspeich-muenchen.de
- https://mazda-autohaus-fritsche-grossschoenau.de
- https://mazda-autohaus-sturne-grimma.de
- https://mazda-autohaus-schindlbeck-straubing.de
- https://mazda-autohaus-mueller-und-thurnes-tholey.de
- https://mazda-autohaus-albstadt-auto-domicil-ebingen.de
- https://mazda-autohaus-doerenkaemper-bad-hersfeld.de
- https://mazda-autohaus-stiefel-muehlacker.de
- https://mazda-autohaus-boehme-lutherstadt-wittenberg.de
- https://mazda-autohaus-abs-erlangen.de
- https://mazda-autohaus-wilhelm-huellhorst.de
- https://mazda-autohaus-lehmann-senftenberg.de
- https://mazda-autohaus-heider-dresden.de
- https://mazda-autohaus-rausch-dresden.de
- https://mazda-autohaus-voigtlaender-meyer-hamburg.de
- https://mazda-autohaus-lackmann-sendenhorst.de
- https://mazda-automobile-weberpals-sonneberg-hoenbach.de
- https://mazda-autohaus-hansmann-melsungen.de
- https://mazda-autohaus-schmidt-meschede.de
- https://mazda-autohaus-weber-magdeburg.de
- https://mazda-autocentrum-engin-holzminden.de
- https://mazda-autohaus-kramer-kirchberg.de
- https://mazda-autohaus-w-k-kamen.de
- https://mazda-autohaus-tietje-holmb-wedel.de
- https://mazda-autohaus-engelbart-delmenhorst.de
- https://mazda-autohaus-mueller-und-thurnes-tholey.de
- https://mazda-autohaus-gruendel-doerth.de
- https://mazda-autohaus-wedding-engelskirchen-albertsth.de
- https://mazda-autohaus-trumpf-wimmelburg.de
- https://mazda-autohaus-lohmann-kreuztal.de
- https://mazda-autohaus-tillack-perleberg.de
- https://mazda-autohaus-misch-uebach-palenberg.de
- https://mazda-autohaus-suedring-datteln.de
- https://mazda-automobile-maier-cham.de
- https://mazda-autohaus-boehme-lutherstadt-wittenberg.de
- https://mazda-autohaus-hamester-hamburg-bergedorf.de
- https://mazda-autohaus-ruettiger-wallduern.de
- https://mazda-autohaus-bolluck-goslar.de
- https://mazda-autohaus-hansmann-melsungen.de
- https://mazda-autohaus-kaschmieder-waren.de
- https://mazda-autohaus-hellwig-hoyerswerda.de
- https://mazda-autohaus-wagner-dortmund.de
- https://mazda-automobile-maier-cham.de
- https://mazda-autohaus-berlenbach-bergischgladbach.de
- https://mazda-autohaus-eisele-langenau.de
- https://mazda-autohaus-witthoeft-bad-oldesloe.de
- https://mazda-autohaus-roeser-grossmaischeid.de
- https://mazda-autohaus-klein-bietigheim-bissingen.de
- https://mazda-autohaus-haese-erkrath-hochdahl.de
- https://mazda-autohaus-misch-uebach-palenberg.de
- https://mazda-autohaus-eisele-langenau.de
- https://mazda-autohaus-bayer-goessweinstein.de
- https://mazda-autohaus-ehrlich-aschaffenburg.de
- https://mazda-autocentrum-engin-holzminden.de
- https://mazda-autohaus-hansmann-kassel.de
- https://mazda-autohaus-schmidt-oschatz.de
- https://mazda-autohaus-gerhard-figge-waldeck-hoeringhausen.de
- https://mazda-autohaus-schmidt-grossenhain.de
- https://mazda-autohaus-trumpf-wimmelburg.de
- https://mazda-autohaus-dittrich-genthin-huettermuehle.de
- https://mazda-autohaus-schmidt-grossenhain.de
- https://mazda-autohaus-schneider-sondershausen.de
- https://mazda-autohaus-rottmann-bottrop.de
- https://mazda-autohaus-stoelzel-doehlau.de
- https://mazda-autohaus-baumgart-altensteig.de
- https://mazda-autohaus-ludwig-halle-neustadt.de
- https://mazda-autohaus-kopke-bendel-marl.de
- https://mazda-autohaus-haeusler-fuerstenfeldbruck.de
- https://mazda-autohaus-hamester-hamburg-bergedorf.de
- https://mazda-autohaus-albers-doerpen.de
- https://mazda-service-metz-marne.de
- https://mazda-autohaus-weiss-niedernhausen.de
- https://mazda-autohaus-schindlbeck-schwandorf.de
- https://mazda-autohaus-grasdanner-holzkirchen.de
- https://mazda-autohaus-ehrlich-aschaffenburg.de
- https://mazda-autohaus-kalina-gelsenkirchen.de
- https://mazda-autohaus-wagner-dortmund.de
- https://mazda-autohaus-rottmann-bottrop.de
- https://mazda-autohaus-gerhard-figge-waldeck-hoeringhausen.de
- https://mazda-autohaus-stoelzel-doehlau.de
- https://mazda-autohaus-hoeffner-clausen.de
- https://mazda-autohaus-tabbouch-speyer.de
- https://mazda-autohaus-engelbart-delmenhorst.de
- https://mazda-autohaus-suedring-datteln.de
- https://mazda-autohaus-goedde-meschede.de
- https://mazda-autohaus-fritsche-grossschoenau.de
- https://mazda-autohaus-ahb-gotha.de
- https://mazda-autohaus-voigtlaender-meyer-hamburg.de
- https://mazda-autohaus-rausch-dresden.de
- https://mazda-autohaus-friedmann-steinfeld.de
- https://mazda-autohaus-berlenbach-bergischgladbach.de
- https://mazda-autohaus-gollan-hamm.de
- https://mazda-autohaus-thoss-falkenstein.de
- https://mazda-autohaus-doerenkaemper-bad-hersfeld.de
- https://mazda-autohaus-ubben-aurich.de
- https://mazda-autohaus-torp-wilhelmshaven.de
- https://mazda-autohaus-gollan-hamm.de
- https://mazda-autohaus-schneider-sondershausen.de
- https://mazda-autopark-rath-krefeld.de
- https://mazda-autohaus-dohm-horn-bad-meinberg.de
- https://mazda-autohaus-schreier-biebergemuend-bieber.de
- https://mazda-autohaus-elstner-jena.de
- https://mazda-autohaus-brutschin-lenzkirch.de
- https://mazda-autohaus-torp-wilhelmshaven.de
- https://mazda-autohaus-mueller-plauen.de
- https://mazda-autohaus-bolluck-goslar.de
- https://mazda-autohaus-gruendel-doerth.de
- https://mazda-autohaus-hoeffner-clausen.de
- https://mazda-autohaus-schindlbeck-straubing.de
- https://mazda-autohaus-wilk-kaczmarek-schwerin.de
- https://mazda-autohaus-friedmann-steinfeld.de
- https://mazda-autohaus-schmidt-meschede.de
- https://mazda-autohaus-blank-dinkelsbuehl.de
- https://mazda-autohaus-schindlbeck-schwandorf.de
- https://mazda-autohaus-wedding-engelskirchen-albertsth.de
- https://mazda-autohaus-albers-doerpen.de
- https://mazda-autohaus-ruettiger-wallduern.de
- https://mazda-autohaus-bayer-goessweinstein.de
- https://mazda-autohaus-banaszak-kleve.de
- https://mazda-autohaus-schwenke-duisburg.de
- https://mazda-autohaus-wassing-ahaus-wuellen.de
- https://mazda-autohaus-moellenkamp-rheine.de
- https://mazda-autohaus-born-ludwigslust.de
- https://mazda-autohaus-roeser-grossmaischeid.de
- https://mazda-autohaus-klein-bietigheim-bissingen.de
- https://mazda-autohaus-albstadt-auto-domicil-ebingen.de
- https://mazda-autohaus-becker-homburg-bruchhof.de
- https://mazda-autohaus-lommel-grettstadt.de
- https://mazda-autohaus-weiss-niedernhausen.de
- https://mazda-autohaus-kopke-bendel-marl.de
- https://mazda-autohaus-baumgart-altensteig.de
- https://mazda-autohaus-richter-forst.de
- https://mazda-autohaus-flindt-marschacht.de
- https://mazda-autohaus-schreier-biebergemuend-bieber.de
- https://mazda-autohaus-ahb-gotha.de
- https://mazda-automobile-weberpals-sonneberg-hoenbach.de
- https://mazda-autohaus-hohenfeld-dinslaken.de
- https://mazda-autohaus-stiefel-muehlacker.de
- https://mazda-autohaus-heider-dresden.de
- https://mazda-autohaus-richter-forst.de
- https://mazda-autohaus-mork-rockenhausen.de
- https://mazda-autohaus-wilk-kaczmarek-schwerin.de
- https://mazda-autohaus-sturne-rochlitz.de
- https://mazda-autohaus-wuttke-gummersbach.de
- https://mazda-autohaus-behrens-magdeburg-ottersleben.de
- https://mazda-autohaus-witthoeft-bad-oldesloe.de
- https://mazda-autohaus-dohm-horn-bad-meinberg.de
- https://mazda-autohaus-schmidt-oschatz.de
- https://mazda-autohaus-lehmann-senftenberg.de
- https://mazda-autohaus-goedde-meschede.de
- https://mazda-autohaus-buelo-naumburg.de
- https://mazda-autohaus-henn-weilamrhein.de
- https://mazda-autohaus-schwenke-duisburg.de
- https://mazda-autohaus-tillack-perleberg.de
- https://mazda-autohaus-henn-weilamrhein.de
- https://mazda-autohaus-banaszak-wesel.de
- https://mazda-autohaus-lohmann-kreuztal.de
- https://mazda-autohaus-w-k-kamen.de
- https://mazda-autohaus-kramer-kirchberg.de
- https://mazda-autohaus-weber-magdeburg.de
- https://mazda-autohaus-lotspeich-muenchen.de
- https://mazda-autohaus-banaszak-wesel.de
- https://mazda-autohaus-kalina-gelsenkirchen.de
- https://mazda-autohaus-wilhelm-huellhorst.de
- https://mazda-autohaus-flindt-marschacht.de
- https://mazda-autohaus-ubben-aurich.de
- https://mazda-autohaus-abs-erlangen.de
- https://mazda-service-metz-marne.de
- https://mazda-autohaus-behrens-magdeburg-ottersleben.de
- https://mazda-autohaus-tietje-holmb-wedel.de
- https://mazda-autohaus-brutschin-lenzkirch.de
- https://mazda-autohaus-hohenfeld-dinslaken.de
- https://mazda-autohaus-lommel-grettstadt.de
- https://mazda-autohaus-grasdanner-holzkirchen.de
- https://mazda-autohaus-born-ludwigslust.de

**Sample Logo:** https://www.assets.mazda-autohaus.de/assets/img/favicons/apple-touch-icon.png

</details>

### 2. Group with 185 sites

<details>
<summary>Click to expand sites</summary>

- https://aamcoanaheim.net
- https://aamcoconyersga.com
- https://aamcodelran.com
- https://aamcobloomfield.com
- https://aamcosalemor.com
- https://aamcowilliamsportpa.com
- https://aamcocatonsvillemd.com
- https://aamcotulsa-memorial.com
- https://aamcopasadenatx.com
- https://aamcofeastervillepa.com
- https://aamcosantaclaritaca.com
- https://aamcosuffolkva.com
- https://aamcometuchen.com
- https://aamcotulsa-brokenarrow.com
- https://aamcoeverett.com
- https://aamcoclaymontde.com
- https://aamcoparkvillemd.com
- https://aamcowestbroward.com
- https://aamcohialeahfl.com
- https://aamcoindependencemo.com
- https://aamcoburbank.com
- https://aamcomissouricitytx.com
- https://aamcopompanobeach.com
- https://aamcovinelandnj.com
- https://aamcopottstownpa.com
- https://aamcosilverspringmd.com
- https://aamcochannelviewtx.com
- https://aamcoroslindalema.com
- https://aamcobrooklyn-ralphave.com
- https://aamcoinglewoodca.com
- https://aamcoalexandriava.com
- https://aamcovirginiabeachva.com
- https://aamcomorristown.com
- https://aamcowestpalmbeach.com
- https://aamco-taylorsvilleut.com
- https://aamcoathensga.com
- https://aamcosantarosa.com
- https://aamconewwindsor.com
- https://aamcowoodbridgeva.com
- https://aamcosignalhill.com
- https://aamcokcnorth.com
- https://aamconorthtampa.com
- https://aamcophilly-frankfordave.com
- https://aamcopennsaukennj.com
- https://aamconewportnews.com
- https://aamcotigard.com
- https://aamcoseattlewa.com
- https://aamcoastoria.com
- https://aamcosouthloopautorepair.com
- https://aamcoalbuquerque.com
- https://aamcocentraltampa.com
- https://aamcotwinfalls.com
- https://aamcobearde.com
- https://aamcostatenisland.com
- https://aamco-chesapeakeva.com
- https://aamcocorvallisor.com
- https://aamcophoenixnortheast.com
- https://aamcooaklandca.com
- https://aamcopembroke.com
- https://aamcooklahomacity-edmond.com
- https://aamcobaltimore-pulaskihwy.com
- https://aamcoeuless.com
- https://aamcoaloha.com
- https://aamcosantacruzca.com
- https://aamcoscottsdaleroad.com
- https://aamcodallastx.com
- https://aamcofremontca.com
- https://aamcoglendalearrowhead.com
- https://aamcowebstertx.com
- https://aamcohuntingtonbeachca.com
- https://aamcohouston-veteransmemorial.com
- https://aamcodovernj.com
- https://aamcoscottsdaleairpark.com
- https://aamcotransmissionpensacola.com
- https://aamcowoodstock-mainst.com
- https://aamcohemetca.com
- https://aamcofrederickmd.com
- https://aamcobrooklyn-atlanticave.com
- https://aamcolakeforestca.com
- https://aamcosouthtampa.com
- https://aamcocharlottesville.com
- https://aamcomurraysouthsaltlakecity.com
- https://aamcoeugeneor.com
- https://aamcofontanaca.com
- https://aamcowarrentonva.com
- https://aamcobakersfield-whiteln.com
- https://aamcocapistranobeachca.com
- https://aamcoconcord.com
- https://aamcomorrisvillepa.com
- https://aamcosanrafaelca.com
- https://aamcocoronaca.com
- https://aamcolaurelmd.com
- https://aamcotransmissionsknoxville-kingstonpike.com
- https://aamcospringfieldoh.com
- https://aamcoeastonpa.com
- https://aamcooklahomacity-yukon.com
- https://aamconorthwestfwy-houston.com
- https://aamcoeastpointga.com
- https://aamcorochesterny.com
- https://aamcomiami-birdroad.com
- https://aamcoaustin-burnetrd.com
- https://aamcochino.com
- https://aamconorthridgeca.com
- https://aamcoorange.com
- https://aamcolongbeachca.com
- https://aamcosandiego-missionbay.com
- https://aamcohagerstownmd.com
- https://aamcoviennava.com
- https://aamcomorenovalley.com
- https://aamcolexingtonparkmd.com
- https://aamcosurprise.com
- https://aamcopasadenaca.com
- https://aamcoroanokeva.com
- https://aamcolexingtoneast.com
- https://aamcomorganhill.com
- https://aamcola-culvercity.com
- https://aamcodelraybeach.com
- https://aamcoofupland.com
- https://aamcophoenixville.com
- https://aamcobrookfieldwi.com
- https://aamcovictorvilleca.com
- https://aamcoeastbrunswick.com
- https://aamcobridgewater.com
- https://aamcospringfield.com
- https://aamcoeggharbortwp.com
- https://aamcostroudsburg.com
- https://aamcowashingtondc.com
- https://aamcobronx.com
- https://aamcoroundrocktx.com
- https://aamcopeoria-az.com
- https://aamcoabingtonpa.com
- https://aamcoreadingpa.com
- https://aamcocolumbus-wbroadst.com
- https://aamcophoenixmaryvale.com
- https://aamcomiddletownny.com
- https://aamcofortlauderdale-plantation.com
- https://aamcocovinaca.com
- https://aamcospokanevalleywa.com
- https://aamcoelcajon.com
- https://aamcopomonaca.com
- https://aamcopatchogue.com
- https://aamcosantaanaca.com
- https://aamcoerlanger.com
- https://aamcoranchocucamonga.com
- https://aamcocolumbus-clevelandave.com
- https://aamcostuartfl.com
- https://aamcogaithersburgmd.com
- https://aamco-duluthga.com
- https://aamcoredlandsca.com
- https://aamcorockvillemd.com
- https://aamconorwalk.com
- https://aamcomanchesterct.com
- https://aamcobristolpa.com
- https://aamcomanassasva.com
- https://aamcohightstownnj.com
- https://aamcospringfieldva.com
- https://aamcotopekaks.com
- https://aamcocantonga.com
- https://aamcoportsmouthnh.com
- https://aamcosandiego-miramar.com
- https://aamcolubbock.com
- https://aamcoahwatukee.com
- https://aamcoantiochca.com
- https://aamcodowneyca.com
- https://aamcovancouver99.com
- https://aamcohackettstown.com
- https://aamcotemeculaca.com
- https://aamcohamptonva.com
- https://aamcoconcordnh.com
- https://aamcowalnutcreekca.com
- https://aamcocedarparktx.com
- https://aamcolexingtonwest.com
- https://aamcooklahomacity-northwest.com
- https://aamcoglendaleca.com
- https://aamcofortlauderdale-dixiehwy.com
- https://aamcoblog.com
- https://aamcosouthsarasota.com
- https://aamcobradenton.com
- https://aamcomcdonoughga.com
- https://aamcosanbernardinoca.com
- https://aamcotulsa-harvard.com
- https://aamcomcallen.com
- https://aamcorandallstownmd.com
- https://aamcocarync.com
- https://aamcolawrencevillega.com

**Sample Logo:** http://www.aamcoanaheim.net/images/logo.png

</details>

### 3. Group with 119 sites

<details>
<summary>Click to expand sites</summary>

- https://toyotanatas.com.tr
- https://toyotaaktoy.com.tr
- https://toyotagocmenturk.com.tr
- https://toyotaaktoy.com.tr
- https://toyota-bauer.at
- https://toyotasandikci.com.tr
- https://toyotakar.com.tr
- https://toyotabakircilarfethiye.com.tr
- https://toyotacavdarli.com.tr
- https://toyotasarar.com.tr
- https://toyotaakkoyunlu.com.tr
- https://toyotaotojen.com.tr
- https://toyotaconstanta.ro
- https://toyotagoktepe.com.tr
- https://toyotabucurestinord.ro
- https://toyotamezcar.com.tr
- https://toyotatokullar.com.tr
- https://toyota-s.co.il
- https://toyotanatas.com.tr
- https://toyotamici.com.tr
- https://toyotaelpa.com.tr
- https://toyotasamlioglu.com.tr
- https://toyotaakkoyunlu.com.tr
- https://toyotayoruk.com.tr
- https://toyotasarar.com.tr
- https://toyotaefe.com.tr
- https://toyotayatumugla.com.tr
- https://toyotasud.ro
- https://toyotaparmaksizlar.com.tr
- https://toyotamezcar.com.tr
- https://toyotasamlioglu.com.tr
- https://toyotatoyan.com.tr
- https://toyotahizel.com.tr
- https://toyotaploiesti.ro
- https://toyotaboranlar.com.tr
- https://toyotaefe.com.tr
- https://toyotaparmaksizlar.com.tr
- https://toyotakuzen.com.tr
- https://toyotaoztoprakhatay.com.tr
- https://toyotabakircilarfethiye.com.tr
- https://toyotaelpa.com.tr
- https://toyota-ulrichshofer.at
- https://toyotamezcar.com.tr
- https://toyotayigitvar.com.tr
- https://toyotahizel.com.tr
- https://toyotabakircilarfethiye.com.tr
- https://toyotacetas.com.tr
- https://toyotayoruk.com.tr
- https://toyotayigitvar.com.tr
- https://toyotaaydogan.com.tr
- https://toyotaderinderekocak.com.tr
- https://toyotaaykon.com.tr
- https://toyota-s.co.il
- https://toyotayatubodrum.com.tr
- https://toyotaaykon.com.tr
- https://toyotayatubodrum.com.tr
- https://toyotaploiesti.ro
- https://toyotaderinderekocak.com.tr
- https://toyotayatumugla.com.tr
- https://toyotaderinderekocak.com.tr
- https://toyota-innviertel.at
- https://toyotaborovali.com.tr
- https://toyotaoztoprakhatay.com.tr
- https://toyotatokullar.com.tr
- https://toyotaakten.com.tr
- https://toyota-bauer.at
- https://toyotaotojen.com.tr
- https://toyotaotojen.com.tr
- https://toyotacavdarli.com.tr
- https://toyotacavdarli.com.tr
- https://toyotaoztoprakhatay.com.tr
- https://toyotaelpa.com.tr
- https://toyotaborovali.com.tr
- https://toyotatokullar.com.tr
- https://toyotasarar.com.tr
- https://toyotayoruk.com.tr
- https://toyotaer.com.tr
- https://toyotanatas.com.tr
- https://toyotaonatca.com.tr
- https://toyotahizel.com.tr
- https://toyotasonkar.com.tr
- https://toyotagoktepe.com.tr
- https://toyota-handler.at
- https://toyotasonkar.com.tr
- https://toyotabucurestinord.ro
- https://toyotayatumugla.com.tr
- https://toyotaakkoyunlu.com.tr
- https://toyotaaktoy.com.tr
- https://toyotamici.com.tr
- https://toyotatoyan.com.tr
- https://toyotaakten.com.tr
- https://toyotaaydogan.com.tr
- https://toyotaer.com.tr
- https://toyotacetas.com.tr
- https://toyotaefe.com.tr
- https://toyotagocmenturk.com.tr
- https://toyotatoyan.com.tr
- https://toyotagocmenturk.com.tr
- https://toyotaaykon.com.tr
- https://toyotaakten.com.tr
- https://toyotakocaelikaya.com.tr
- https://toyotakuzen.com.tr
- https://toyotayatubodrum.com.tr
- https://toyotakocaelikaya.com.tr
- https://toyotakar.com.tr
- https://toyotaonatca.com.tr
- https://toyotakuzen.com.tr
- https://toyota-s.co.il
- https://toyotayigitvar.com.tr
- https://toyotasandikci.com.tr
- https://toyotaboranlar.com.tr
- https://toyotasonkar.com.tr
- https://toyotaonatca.com.tr
- https://toyotaaydogan.com.tr
- https://toyotaborovali.com.tr
- https://toyotakocaelikaya.com.tr
- https://toyotamici.com.tr
- https://toyotaer.com.tr
- https://toyotasud.ro

**Sample Logo:** https://www.toyotanatas.com.tr/Assets/img/apple-touch-icon.png

</details>

### 4. Group with 81 sites

<details>
<summary>Click to expand sites</summary>

- https://mazda.de
- https://besins-healthcare.se
- https://renault.dk
- https://lamborghini-zh.ch
- https://cdlbarreiras.com.br
- https://tupperware.co.kr
- https://mazda.hu
- https://brother-slovakia.sk
- https://suttontools.co.nz
- https://sto-ukraine.com
- https://brother-industrial.md
- https://besins-healthcare.nl
- https://worldvision.cl
- https://alcirclebiz.com
- https://kiaonline.dk
- https://castsoftware.it
- https://sto-ukraine.com
- https://renault.dk
- https://orange.cm
- https://habitatns.ca
- https://mazda.si
- https://ardex.de
- https://besins-healthcare.com.mx
- https://brother-industrial.com
- https://renault-beaulieu.fr
- https://habitat.hu
- https://toyotaalbania.al
- https://bonprix.se
- https://unglobalcompact.ca
- https://lunarclient.com
- https://bakertilly.uy
- https://seqens.fi
- https://premiumproperties.com
- https://ardex-france.fr
- https://rexel.se
- https://renaultbank.es
- https://hertzhn.com
- https://dolcevita.ca
- https://bonprix.jobs
- https://svncredit.ro
- https://invisalign.fr
- https://hyrox.es
- https://renaultbank.es
- https://toyotasanpablo.com.ph
- https://mazda.nl
- https://spp.cz
- https://renault-beaulieu.fr
- https://ctdi.in
- https://bonprix.ch
- https://mazda.es
- https://msmode.de
- https://mazda.es
- https://chubblifefund.com.vn
- https://worldvision.cl
- https://canonburgos.com
- https://toyota.co.tz
- https://malerasstockholm.se
- https://invisalign.co.kr
- https://kokuyo-furniture.com.my
- https://toyotaalbania.al
- https://eca-serel.de
- https://toyotapasongtamo.com
- https://rubiomonocoat.com.pl
- https://kia-bandung.com
- https://cpi-print.com
- https://msmode.es
- https://filatime.com
- https://bakertillymlt.se
- https://msmode.fr
- https://citychain.co.th
- https://mazda.com.tr
- https://ardex.eu
- https://mazda.hu
- https://mazda.si
- https://toysrus.pt
- https://lamborghini-rotterdam.nl
- https://kia.com.co
- https://mazda.com.tr
- https://exertisztorm.com
- https://msmode.lu
- https://toysrus.pt

**Sample Logo:** https://www.mazda.de/favicon-apple-touch-icon.png

</details>

### 5. Group with 78 sites

<details>
<summary>Click to expand sites</summary>

- https://veolia.com.ru
- https://veolia.in
- https://veolia.pl
- https://veoliawatertechnologies.fi
- https://veolia.bg
- https://veoliawatertechnologies.pl
- https://veolia.fi
- https://veolia.co.za
- https://veolia.am
- https://veoliawatertechnologies.fr
- https://veoliawatertechnologies.fi
- https://veolia.ma
- https://veolia.co.za
- https://veoliawatertechnologies.es
- https://veolia.com.sg
- https://veoliawatertechnologies.it
- https://veoliawatertechnologies.de
- https://veoliawatertechnologies.pl
- https://veoliawatertechnologies.de
- https://veolia.com.gh
- https://veoliawatertech.com
- https://veolia.sk
- https://veoliawatertechnologies.fi
- https://veolia.com.ru
- https://veolia.cz
- https://veolia.in
- https://veolia.com.gh
- https://veolia.am
- https://veolia.bg
- https://veolia.cn
- https://veoliawatertechnologies.es
- https://veolia.com.gh
- https://veoliawatertechnologies.de
- https://veolia.com.gh
- https://veolia.jp
- https://veolia.ma
- https://veolia.cn
- https://veolia.ie
- https://veolia.sk
- https://veolia.ie
- https://veolia.com.sg
- https://veolia.bg
- https://veolia.cz
- https://veoliawatertechnologies.pl
- https://veoliawatertechnologies.es
- https://veolia.pl
- https://veoliawatertechnologies.fi
- https://veolia.fi
- https://veoliawatertechnologies.fr
- https://veoliawatertechnologies.it
- https://veolia.com.ru
- https://veolia.jp
- https://veolia.ma
- https://veolia.com.ru
- https://veoliawatertech.com
- https://krugerkaldnes.no
- https://veoliawatertechnologies.pl
- https://veoliawatertechnologies.fr
- https://veoliawatertech.com
- https://veolia.jp
- https://veolia.pl
- https://veolia.cz
- https://veolia.ma
- https://biothanesolutions.com
- https://veoliawatertechnologies.it
- https://veolia.co.za
- https://veolia.in
- https://veolia.am
- https://krugerkaldnes.no
- https://veolia.am
- https://veolia.co.za
- https://veolia.fi
- https://biothanesolutions.com
- https://veoliawatertechnologies.de
- https://veolia.com.sg
- https://veolia.fi
- https://veolia.sk
- https://biothanesolutions.com

**Sample Logo:** https://www.veolia.com.ru/sites/g/files/dvc2936/files/styles/logo_mobile_base/public/themes/custom/veo_site/src/assets/images/logo.png.webp?itok=kInPqI51

</details>

### 6. Group with 57 sites

<details>
<summary>Click to expand sites</summary>

- https://bakertilly.lu
- https://bakertilly.es
- https://bakertilly.ci
- https://bakertilly.ky
- https://bakertilly.dk
- https://bakertilly.lv
- https://bakertilly.sg
- https://bakertilly.sl
- https://bakertilly.gt
- https://bakertilly.fr
- https://bakertillylb.com
- https://bakertilly.cl
- https://bakertilly.se
- https://bakertilly.it
- https://bakertilly.com.kh
- https://bakertilly.no
- https://bakertillylb.com
- https://bakertilly.pk
- https://bakertilly.sl
- https://bakertillyeg.com
- https://bakertilly.ma
- https://bakertilly.vg
- https://bakertilly.ng
- https://bakertilly.es
- https://bakertilly.ky
- https://bakertilly.mu
- https://bakertilly.lv
- https://bakertilly.ci
- https://bakertilly.pt
- https://bakertilly.gt
- https://bakertilly.cl
- https://bakertilly.ky
- https://bakertilly.ng
- https://bakertilly.no
- https://bakertilly.lu
- https://bakertilly.sg
- https://bakertilly.dk
- https://bakertilly.gt
- https://bakertilly.site
- https://bakertillygh.com
- https://bakertilly.gi
- https://bakertilly.com.jm
- https://bakertilly.sl
- https://bakertilly.com.jm
- https://bakertilly.ma
- https://bakertilly.ma
- https://bakertillygh.com
- https://bakertilly.it
- https://bakertilly.ng
- https://bakertilly.pt
- https://bakertilly.gi
- https://bakertilly.se
- https://bakertilly.gi
- https://bakertilly.mu
- https://bakertillyeg.com
- https://bakertilly.lu
- https://bakertilly.vg

**Sample Logo:** https://www.bakertilly.lu/apple-touch-icon.png

</details>

### 7. Group with 45 sites

<details>
<summary>Click to expand sites</summary>

- https://daikinkuwait.com
- https://daikin-ksa.com
- https://daikinlebanon.com
- https://daikinafrica.com
- https://daikinegypt.com
- https://carglass.si
- https://daikin.ch
- https://daikin.rs
- https://daikinegypt.com
- https://daikinqatar.com
- https://daikinbahrain.com
- https://daikindevice.cz
- https://daikinmea.com
- https://daikin.fi
- https://daikin-manufacturing.de
- https://daikin.ch
- https://daikin-ce.com
- https://daikin.si
- https://daikin.fi
- https://daikin.ru
- https://daikin.az
- https://daikin-manufacturing.de
- https://daikinqatar.com
- https://daikin.rs
- https://daikin-ce.com
- https://daikinczech.cz
- https://daikin.az
- https://daikin.mk
- https://daikin.mk
- https://daikinuae.com
- https://daikinkuwait.com
- https://daikin.ru
- https://daikin.al
- https://daikin.al
- https://daikinuae.com
- https://daikin.si
- https://daikinbahrain.com
- https://daikin-iraq.com
- https://daikinczech.cz
- https://daikindevice.cz
- https://daikinafrica.com
- https://daikinlebanon.com
- https://daikin-ksa.com
- https://daikin-iraq.com
- https://daikin.eu

**Sample Logo:** https://www.daikinkuwait.com/etc.clientlibs/daikin/clientlibs/clientlib-internet-site/resources/images/app-icon/apple-touch-icon.png

</details>

### 8. Group with 39 sites

<details>
<summary>Click to expand sites</summary>

- https://linde-gas.fi
- https://linde-electronics.com
- https://linde-electronics.com
- https://linde-gas.ee
- https://linde.co.th
- https://linde-gas.ee
- https://linde-gas.ee
- https://lindesaude.pt
- https://linde-gas.sk
- https://linde-gas.lv
- https://lindesaude.pt
- https://linde-electronics.com
- https://linde-gas.fi
- https://linde-electronics.com
- https://linde-gas.no
- https://linde-gas.lv
- https://linde-medica.es
- https://lindegas.hu
- https://linde-gas.ee
- https://linde-gas.lv
- https://lindesaude.pt
- https://linde-electronics.com
- https://linde-gas.lt
- https://linde-gas.lv
- https://lindesaude.pt
- https://linde-gas.lt
- https://lindesaude.pt
- https://lindegas.hu
- https://lindegas.hu
- https://linde-gas.lt
- https://linde-electronics.com
- https://lindesaude.pt
- https://linde-gas.sk
- https://linde-gas.fi
- https://linde-gas.no
- https://linde-gas.lt
- https://linde-gas.ee
- https://linde-gas.lv
- https://linde.co.th

**Sample Logo:** https://static.prd.echannel.linde.com/wcsstore/EE_REN_Industrial_Gas_Store/images/Linde_plc_UTG_logo_1_CMYK_IsoCV2.png

</details>

### 9. Group with 31 sites

<details>
<summary>Click to expand sites</summary>

- https://bbraun.rs
- https://bbraun.ae
- https://bbraun.ca
- https://bbraun.ph
- https://bbraun.lt
- https://bbraun.co.uk
- https://bbraun.com.vn
- https://bbraun.se
- https://bbraun.co
- https://bbraun.pt
- https://bbraun.lv
- https://bbraun.hr
- https://bbraun.co.kr
- https://bbraun.dk
- https://bbraun.co.in
- https://bbraun.hu
- https://bbraun.com.br
- https://bbraun.ec
- https://bbraun.cl
- https://bbraun.pk
- https://bbraun.com.tw
- https://bbraun.be
- https://bbraun.nl
- https://bbraun.com.my
- https://bbraun.ro
- https://bbraun.no
- https://bbraun.fi
- https://bbraun.cz
- https://bbraun.co.th
- https://bbraun.co.za
- https://bbraun.cn

**Sample Logo:** https://www.bbraun.rs/etc.clientlibs/settings/wcm/designs/clientlibs/bbraun/bbraun.static/resources/img/bbraun-redesign_touch-icon-180x180.png

</details>

### 10. Group with 30 sites

<details>
<summary>Click to expand sites</summary>

- https://actemium.ch
- https://actemium.pt
- https://actemium.com
- https://actemium.at
- https://actemium.ch
- https://actemium.us
- https://actemium.sk
- https://actemium.id
- https://actemium.pt
- https://actemium.de
- https://actemium.it
- https://actemium.id
- https://actemium.es
- https://actemium.us
- https://actemium.co.uk
- https://actemium.it
- https://actemium.co.uk
- https://actemium.com.br
- https://actemium.ca
- https://actemium.id
- https://actemium.sk
- https://actemium.com.br
- https://actemium.sk
- https://actemium.com.br
- https://actemium.nl
- https://actemium.at
- https://actemium.at
- https://actemium.se
- https://actemium.it
- https://actemium.us

**Sample Logo:** https://www.actemium.ch/app/themes/actemium/resources/assets/images/favicons/apple-touch-icon.png

</details>


## 💡 Key Insights

- **Duplicate Detection Rate:** 32.87% of groups contain duplicates
- **Average Group Size:** 2.96 sites per group
- **Largest Group:** 197 identical logos found
- **Efficiency:** Found 2262 duplicate logo instances across 379 groups

---

*Generated by Logo Grouping Engine • 1/29/2026, 5:09:59 PM*

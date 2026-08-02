import axios from "axios";

const urls = [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Wadephul%2C_Johann-1249.jpg/500px-Wadephul%2C_Johann-1249.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93076_%28cropped%29.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93076_%28cropped%29.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/2020-02-13_Deutscher_Bundestag_IMG_3091_by_Stepro.jpg/500px-2020-02-13_Deutscher_Bundestag_IMG_3091_by_Stepro.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93118.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93118.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Boris_Pistorius_%282019%29_%28cropped%29.jpg/500px-Boris_Pistorius_%282019%29_%28cropped%29.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93033.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93033.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/2025-02-23_Bundestagswahl_%E2%80%93_Wahlabend_CDU_by_Sandro_Halank%E2%80%93083.jpg/500px-2025-02-23_Bundestagswahl_%E2%80%93_Wahlabend_CDU_by_Sandro_Halank%E2%80%93083.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Karsten_WILDBERGER_%28Federal_Minister_for_Digital_and_State_Modernisation%2C_Germany%29.jpg/500px-Karsten_WILDBERGER_%28Federal_Minister_for_Digital_and_State_Modernisation%2C_Germany%29.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Hart_aber_fair_2024-12-02-8076.jpg/500px-Hart_aber_fair_2024-12-02-8076.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/2025-02-23_Bundestagswahl_%E2%80%93_Wahlabend_CDU_by_Sandro_Halank%E2%80%93052.jpg/500px-2025-02-23_Bundestagswahl_%E2%80%93_Wahlabend_CDU_by_Sandro_Halank%E2%80%93052.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_%28Martin_Rulsch%29_160.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_%28Martin_Rulsch%29_160.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93038.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93038.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Bilger-Pressebild-2024-cmyk2.jpg/500px-Bilger-Pressebild-2024-cmyk2.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Katherina_Reiche_2025-05-15_%28cropped%29.jpg/500px-Katherina_Reiche_2025-05-15_%28cropped%29.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93035.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93035.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93034.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93034.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4265_Crop_3.jpg/500px-Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4265_Crop_3.jpg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93127.jpg/500px-2025-05-05_Unterzeichnung_des_Koalitionsvertrages_der_21._Wahlperiode_des_Bundestages_by_Sandro_Halank%E2%80%93127.jpg",
];

async function run() {
    console.log(`Firing ${urls.length} requests`);
    console.log("In parallel");

    const requests = urls.map(url => {
        return axios.get(
            url,
            {
                headers: {
                    "User-Agent": "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
                },
                responseType: "arraybuffer",
            },
        );
    });

    await Promise.all(requests).map((r, i) => {
        console.log(`Response # ${i} settled.
            Status code: ${r.status}`);
    });
}

run().then(() => console.log("Done.")).catch(err => {
    console.error(err);
    process.exit(1);
});
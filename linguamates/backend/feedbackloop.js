const axios = require("axios");
const fs = require("fs");
const unzipper = require("unzipper");
import { loadPyodide } from "pyodide";

async function downloadDataset(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios.get(url, { responseType: "stream" });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(outputPath));
    writer.on("error", reject);
  });
}

async function extractZip(zipPath, extractTo) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractTo }))
      .on("close", resolve)
      .on("error", reject);
  });
}

async function processCSVWithPyodide(csvPath) {
  const pyodide = await loadPyodide();
  await pyodide.loadPackage("pandas");

  const pythonCode = `
import pandas as pd

# Load dataset
data = pd.read_csv('dataset.csv')

# Clean and process data
data['cleaned_text'] = data['text'].str.lower().str.replace('[^a-zA-Z]', ' ', regex=True)

# Convert to JSONL format
jsonl_data = data[['cleaned_text']].to_json(orient='records', lines=True)
jsonl_data
`;

  const csvContent = fs.readFileSync(csvPath, "utf8");

  pyodide.FS.writeFile("dataset.csv", csvContent);

  const result = pyodide.runPython(pythonCode);

  const outputFile = csvPath.replace(".csv", "_processed.jsonl");
  fs.writeFileSync(outputFile, result);
  console.log(`Processed data saved to: ${outputFile}`);
}

async function main() {
  try {
    const kaggleUrl =
      "https://www.kaggle.com/api/v1/datasets/download/rtatman/120-million-word-spanish-corpus";
    const zipPath = "./dataset.zip";
    const extractPath = "./dataset";

    // Step 1: Download the dataset
    console.log("Downloading dataset...");
    await downloadDataset(kaggleUrl, zipPath);
    console.log("Dataset downloaded successfully!");

    // Step 2: Extract the ZIP file
    console.log("Extracting dataset...");
    await extractZip(zipPath, extractPath);
    console.log("Dataset extracted successfully!");

    // Step 3: Find the CSV file and process it
    const csvFilePath = `${extractPath}/kaggle-dataset.csv`; // Adjust the name as per the dataset
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found at ${csvFilePath}`);
    }

    console.log("Processing CSV file...");
    await processCSVWithPyodide(csvFilePath);
    console.log("CSV processing complete!");
  } catch (error) {
    console.error("Error during dataset processing:", error);
  }
}

main();

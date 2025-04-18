## Installation

1.  **Clone or Download:**
    Get the project files onto your local machine. If it's a Git repository:
    ```bash
    git clone <your-repository-url> # Or download ZIP and extract
    cd <your-project-directory> # e.g., progression-to-midi
    ```
    Otherwise, download and extract the files into a directory.

2.  **Install Dependencies:**
    Navigate to the project directory in your terminal and install the required Node.js packages (including runtime libraries like `midi-writer-js` and development tools like `typescript` and `esbuild`):
    ```bash
    npm install
    ```
    or if you use yarn:
    ```bash
    yarn install
    ```

## Usage (Running Locally)

This application now runs entirely in your browser after a build step.

1.  **Build the Application:**
    Before you can use the generator, you need to compile the TypeScript code and bundle all necessary JavaScript into a single file that the browser can understand. Run the following command in your terminal from the project directory:
    ```bash
    npm run build
    ```
    This command uses `esbuild` (configured in `package.json`) to create the file `dist/bundle.js`. You only need to run this again if you make changes to the code inside the `src` directory.

2.  **Open the HTML Page:**
    After the build is successful, simply open the main HTML file (`index.html`) directly in your web browser.
    * You can usually do this by double-clicking the HTML file in your file explorer.
    * No local web server is required for this setup.

3.  **Generate MIDI:**
    * Once the page is open in your browser, fill out the form with your desired chord progression and options (tempo, octave, duration, etc.).
    * Click the "Generate & Download MIDI" button.
    * Your browser will prompt you to save the generated `.mid` file.

**Development Workflow (Optional)**

If you plan to modify the TypeScript code (`src/main.ts`), you can use the watch command:

```bash
npm run watch
```
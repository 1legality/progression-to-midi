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

## Chord Duration Format

- Chord durations are specified in **bars** (not note values).
- Example: `C:1 G:0.5 Am F` means C for 1 bar, G for half a bar, Am and F will use the default duration selected in the Chord Duration dropdown.
- If no duration is provided for a chord, the default is the value selected in the Chord Duration dropdown on the web interface.

## Instructions: Creating Chord Progressions and Step Sequences

### Chord Progression Mode

- **Format:** Enter chords separated by spaces. Each chord can optionally have a duration specified after a colon.
- **Example:**
  - `C G Am F` (all chords use the default duration)
  - `C:1 G:0.5 Am:2 F` (C for 1 bar, G for half a bar, Am for 2 bars, F uses the default duration)
- **Durations:**
  - Durations are in **bars** (e.g., `1` = 1 bar, `0.5` = half a bar).
  - If no duration is provided, the default is the value selected in the Chord Duration dropdown.
  - Advanced: You can use absolute ticks by prefixing with `T` (e.g., `T128` for a quarter note).
- **Chord Qualities:**
  - Use standard chord symbols (e.g., `C`, `Cm`, `G7`, `F#dim7`).
  - Root notes: A-G, optionally followed by # (sharp) or b (flat).
  - See the in-app help for a full list of supported chord qualities.

### Step Sequencer Mode

- **Format:** Each note is specified as `NoteOrMidi:P#:L#:V#`.
  - `NoteOrMidi`: Note name (e.g., `E3`, `G#4`) or MIDI number (e.g., `60`)
  - `P#`: Position (step number, starting at 1)
  - `L#`: Length (number of steps)
  - `V#`: Velocity (1-127)
- **Example:**
  - `E3:P1:L2:V110 G3:P3:L1:V90`
  - This means E3 starts at step 1 for 2 steps at velocity 110, G3 starts at step 3 for 1 step at velocity 90.
- **Input:**
  - You can enter notes separated by spaces or newlines.
  - The total number of steps is set in the "Total Steps" field.

**Tip:**
- For both modes, you can copy and paste progressions or sequences from your favorite AI or DAW, then adjust as needed.

**Development Workflow (Optional)**

If you plan to modify the TypeScript code (`src/Main.ts`), you can use the watch command:

```bash
npm run watch
```
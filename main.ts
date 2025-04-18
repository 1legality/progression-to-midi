// src/main.ts
import midiWriterJs from 'midi-writer-js';

// --- Constants and Helper Functions ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const INTERVALS = { P1: 0, m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, A4: 6, d5: 6, P5: 7, A5: 8, m6: 8, M6: 9, d7: 9, m7: 10, M7: 11, P8: 12, m9: 13, M9: 14, P11: 17, M13: 21 };
const CHORD_FORMULAS: Record<string, number[]> = {
    '': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5], 'maj': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5], 'm': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5], 'min': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5], 'dim': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5], 'aug': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5], 'sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5], 'sus2': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5], '7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7], 'maj7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7], 'm7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7], 'm(maj7)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7], 'dim7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.d7], 'm7b5': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.m7], '9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9], 'maj9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9], 'm9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9], '11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11], 'm11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11], '13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13], 'maj13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13], 'm13': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
}; // Note: Added Record<string, number[]> type annotation

function normalizeNoteName(note: string): string {
    const name = note.toUpperCase();
    switch (name) {
        case 'DB': return 'C#'; case 'EB': return 'D#'; case 'FB': return 'E'; case 'GB': return 'F#'; case 'AB': return 'G#'; case 'BB': return 'A#'; case 'E#': return 'F'; case 'B#': return 'C'; default: return name;
    }
}

function getNoteIndex(note: string): number {
    const normalizedNote = normalizeNoteName(note);
    const index = NOTES.indexOf(normalizedNote);
    if (index === -1) throw new Error(`Invalid note name: ${note}`);
    return index;
}

function getMidiNote(noteName: string, octave: number): number {
    const noteIndex = getNoteIndex(noteName);
    const midiVal = 12 * (octave + 1) + noteIndex; // C4 = 60
     if (midiVal < 0 || midiVal > 127) {
         console.warn(`Calculated MIDI note ${midiVal} for ${noteName}${octave} is out of range (0-127).`);
     }
    return midiVal;
}

// --- Main Function to Setup Form Interaction ---

function setupMidiForm() {
    const form = document.getElementById('midiForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const velocitySlider = document.getElementById('velocity') as HTMLInputElement | null;
    const velocityValueSpan = document.getElementById('velocityValue');

    if (!form || !statusDiv || !velocitySlider || !velocityValueSpan) {
        console.error("Form elements not found!");
        if (statusDiv) statusDiv.textContent = "Error: Could not find necessary HTML elements.";
        return;
    }

    // Update velocity display
    velocitySlider.addEventListener('input', (event) => {
        velocityValueSpan.textContent = (event.target as HTMLInputElement).value;
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent actual form submission
        statusDiv.textContent = 'Generating MIDI...';
        statusDiv.classList.remove('text-red-600', 'text-green-600');
        statusDiv.classList.add('text-gray-600');

        try {
            // 1. Get form data
            const formData = new FormData(form);
            const progressionString = formData.get('progression') as string;
            const outputFileName = formData.get('outputFileName') as string || 'progression'; // Default name part
            const addBassNote = formData.has('addBassNote');
            const doInversion = formData.has('doInversion');
            const baseOctave = parseInt(formData.get('baseOctave') as string, 10);
            const chordDuration = formData.get('chordDuration') as string;
            const tempo = parseInt(formData.get('tempo') as string, 10);
            const velocity = parseInt(formData.get('velocity') as string, 10);

            if (!progressionString || progressionString.trim() === '') {
                 throw new Error("Chord progression cannot be empty.");
            }

            // Ensure filename ends with .mid
            const finalFileName = outputFileName.endsWith('.mid') ? outputFileName : `${outputFileName}.mid`;

            // 2. Generate MIDI Track
            const track = new midiWriterJs.Track();
            track.setTempo(tempo);
            track.setTimeSignature(4, 4, 24, 8); 
            
            const chordSymbols = progressionString.trim().split(/\s+/);
            const chordRegex = /^([A-G][#b]?)(.*)$/;

            for (const symbol of chordSymbols) {
                if (!symbol) continue;
                const match = symbol.match(chordRegex);

                if (!match) {
                    console.warn(`Could not parse chord symbol: "${symbol}". Skipping.`);
                    track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: chordDuration, duration: chordDuration, velocity: 0 }));
                    continue;
                }

                const rootNoteName = match[1];
                const qualityAndExtensions = match[2];

                try {
                    const rootMidi = getMidiNote(rootNoteName, baseOctave);
                    let formulaIntervals = CHORD_FORMULAS[qualityAndExtensions];
                    if (formulaIntervals === undefined) {
                         if (qualityAndExtensions === '') { formulaIntervals = CHORD_FORMULAS['']; }
                         else { console.warn(`Chord quality "${qualityAndExtensions}" not found for "${symbol}". Defaulting to major triad.`); formulaIntervals = CHORD_FORMULAS['']; }
                    }

                    let chordMidiNotes = formulaIntervals.map(intervalSemitones => rootMidi + intervalSemitones);

                    if (doInversion && chordMidiNotes.length > 1) {
                        chordMidiNotes.sort((a, b) => a - b);
                        const lowestNote = chordMidiNotes.shift();
                        if (lowestNote !== undefined) { chordMidiNotes.push(lowestNote + 12); }
                         chordMidiNotes.sort((a, b) => a - b);
                    }

                    let eventNotes = [...chordMidiNotes];

                    if (addBassNote) {
                        const bassNoteMidi = rootMidi - 12;
                        if (!eventNotes.length || bassNoteMidi < Math.min(...eventNotes)) {
                             if(bassNoteMidi >= 0) { eventNotes.unshift(bassNoteMidi); }
                             else { console.warn(`Calculated bass note ${bassNoteMidi} for ${symbol} is below MIDI range 0. Skipping bass note.`); }
                        }
                    }

                    eventNotes = eventNotes.filter(note => note >= 0 && note <= 127);
                    eventNotes = [...new Set(eventNotes)]; // Remove duplicates

                    if (eventNotes.length > 0) {
                        track.addEvent(new midiWriterJs.NoteEvent({
                            pitch: eventNotes,
                            duration: chordDuration,
                            velocity: velocity
                        }));
                    } else {
                        console.warn(`No valid MIDI notes generated for chord "${symbol}". Adding rest.`);
                        track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: chordDuration, duration: chordDuration, velocity: 0 }));
                    }

                } catch (error: any) { // Catch specific chord processing errors
                     console.error(`Error processing chord "${symbol}" for MIDI: ${error.message}. Adding rest.`);
                     statusDiv.textContent = `Error processing chord "${symbol}": ${error.message}`;
                     statusDiv.classList.replace('text-gray-600','text-red-600');
                     track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: chordDuration, duration: chordDuration, velocity: 0 }));
                }
            } // End chord loop


            // 3. Generate MIDI Data and Trigger Download
            const writer = new midiWriterJs.Writer([track]);
            const midiData = writer.buildFile(); // Get Uint8Array

            const blob = new Blob([midiData], { type: 'audio/midi' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = finalFileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            statusDiv.textContent = `MIDI file "${finalFileName}" prepared for download!`;
            statusDiv.classList.replace('text-gray-600','text-green-600');

        } catch (error: any) { // Catch general errors (e.g., empty progression)
             console.error('Error generating MIDI:', error);
             statusDiv.textContent = `Error: ${error.message}`;
             statusDiv.classList.replace('text-gray-600','text-red-600');
        }
    });
}

// --- Run Setup after DOM is loaded ---
if (document.readyState === 'loading') { // Loading hasn't finished yet
    document.addEventListener('DOMContentLoaded', setupMidiForm);
} else { // `DOMContentLoaded` has already fired
    setupMidiForm();
}
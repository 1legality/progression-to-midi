// MidiGenerator.ts
import midiWriterJs from 'midi-writer-js';

// Keep NoteData interface accessible or redefine if needed
interface NoteData {
    midiNote: number;
    startTimeTicks: number;
    durationTicks: number;
    velocity: number;
}

// --- Constants (can be private static or module-level) ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const INTERVALS = { 
    P1: 0,
    m2: 1,
    M2: 2,
    m3: 3,
    M3: 4,
    P4: 5,
    A4: 6,
    d5: 6,
    P5: 7,
    A5: 8,
    m6: 8,
    M6: 9,
    d7: 9,
    m7: 10,
    M7: 11,
    P8: 12,
    m9: 13,
    M9: 14,
    P11: 17,
    M13: 21
};
const CHORD_FORMULAS: Record<string, number[]> = { 
    '': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
    'maj': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5],
    'm': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
    'min': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5],
    'dim': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5],
    'aug': [INTERVALS.P1, INTERVALS.M3, INTERVALS.A5],
    'sus4': [INTERVALS.P1, INTERVALS.P4, INTERVALS.P5],
    'sus2': [INTERVALS.P1, INTERVALS.M2, INTERVALS.P5],
    '7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7],
    'maj7': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7],
    'm7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7],
    'm(maj7)': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.M7],
    'dim7': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.d7],
    'm7b5': [INTERVALS.P1, INTERVALS.m3, INTERVALS.d5, INTERVALS.m7],
    '9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
    'maj9': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9],
    'm9': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9],
    '11': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
    'm11': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.P11],
    '13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13],
    'maj13': [INTERVALS.P1, INTERVALS.M3, INTERVALS.P5, INTERVALS.M7, INTERVALS.M9, INTERVALS.M13],
    'm13': [INTERVALS.P1, INTERVALS.m3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M9, INTERVALS.M13]
};
const TPQN = 128; // MIDI Writer JS default ticks per quarter note

export interface MidiGenerationOptions {
    progressionString: string;
    outputFileName?: string; // Optional, provide default
    addBassNote: boolean;
    inversionType: 'none' | 'first' | 'smooth';
    baseOctave: number;
    chordDurationStr: string;
    tempo: number;
    velocity: number;
}

export interface MidiGenerationResult {
    notesForPianoRoll: NoteData[];
    midiBlob: Blob;
    finalFileName: string;
}

export class MidiGenerator {

    // --- Helper Functions (can be private methods) ---
    private normalizeNoteName(note: string): string {
        const name = note.toUpperCase();
        switch (name) {
            case 'DB': return 'C#'; case 'EB': return 'D#'; case 'FB': return 'E'; case 'GB': return 'F#'; case 'AB': return 'G#'; case 'BB': return 'A#'; case 'E#': return 'F'; case 'B#': return 'C'; default: return name;
        }
    }

    private getNoteIndex(note: string): number {
        const normalizedNote = this.normalizeNoteName(note);
        const index = NOTES.indexOf(normalizedNote);
        if (index === -1) throw new Error(`Invalid note name: ${note}`);
        return index;
    }

    private getMidiNote(noteName: string, octave: number): number {
        const noteIndex = this.getNoteIndex(noteName);
        const midiVal = 12 * (octave + 1) + noteIndex;
        if (midiVal < 0 || midiVal > 127) {
            console.warn(`Calculated MIDI note ${midiVal} for ${noteName}${octave} is out of range (0-127). Clamping may occur.`);
        }
        return Math.max(0, Math.min(127, midiVal));
    }

    private getDurationTicks(durationCode: string): number {
        switch (durationCode) {
            case '16': return TPQN / 4;
            case '8': return TPQN / 2;
            case 'd4': return TPQN * 1.5;
            case '4': return TPQN;
            case 'd2': return TPQN * 3;
            case '2': return TPQN * 2;
            case '1': return TPQN * 4;
            case 'T1024': return 1024;
            case 'T1536': return 1536;
            case 'T2048': return 2048;
            default:
                console.warn(`Unknown duration code: ${durationCode}. Defaulting to quarter note (${TPQN} ticks).`);
                return TPQN;
        }
    }
    
    /**
     * Generates all possible inversions for a given set of root-position chord notes.
     * @param rootPositionNotes - Array of MIDI notes in root position, sorted low to high.
     * @returns An array of voicings (each an array of MIDI notes), starting with root position.
     */
    private generateInversions(rootPositionNotes: number[]): number[][] {
        if (rootPositionNotes.length <= 1) {
            return [rootPositionNotes]; // No inversions possible/needed
        }

        const allInversions: number[][] = [];
        let currentVoicing = [...rootPositionNotes]; // Start with root position

        // Generate N inversions (including root position) for an N-note chord
        for (let i = 0; i < rootPositionNotes.length; i++) {
            // Ensure it's sorted before adding
            currentVoicing.sort((a, b) => a - b);
            allInversions.push([...currentVoicing]); // Add a copy

            // Prepare next inversion (if not the last one)
            if (i < rootPositionNotes.length - 1) {
                const lowestNote = currentVoicing.shift(); // Remove lowest
                if (lowestNote !== undefined) {
                    currentVoicing.push(lowestNote + 12); // Add it back an octave higher
                }
            }
        }
        return allInversions;
    }

    /**
     * Calculates a distance metric between two chord voicings to estimate smoothness.
     * A lower score means a smoother transition.
     * This simple version sums the absolute MIDI pitch differences of corresponding notes.
     * It penalizes differences in the number of notes.
     * @param voicing1 - First voicing (array of MIDI notes, sorted).
     * @param voicing2 - Second voicing (array of MIDI notes, sorted).
     * @returns A numeric score representing the distance.
     */
    private calculateVoicingDistance(voicing1: number[], voicing2: number[]): number {
        // Ensure copies are sorted
        const sorted1 = [...voicing1].sort((a, b) => a - b);
        const sorted2 = [...voicing2].sort((a, b) => a - b);

        let totalDistance = 0;
        const minLength = Math.min(sorted1.length, sorted2.length);
        const maxLength = Math.max(sorted1.length, sorted2.length);

        // Sum distances for common notes
        for (let i = 0; i < minLength; i++) {
            totalDistance += Math.abs(sorted1[i] - sorted2[i]);
        }

        // Add a penalty for notes present in one chord but not the other
        // We can approximate this by comparing the extra notes to the closest note in the other chord,
        // or simply add a fixed penalty per extra note. Let's use a simpler penalty for now.
        // A penalty of ~6 semitones per note difference might be reasonable.
        const noteCountDifference = maxLength - minLength;
        totalDistance += noteCountDifference * 6; // Penalty factor

        return totalDistance;
    }

    /**
     * Generates MIDI data and note array from provided options.
     * @param options - The settings for MIDI generation.
     * @returns Object containing notesForPianoRoll, midiBlob, and finalFileName, or throws an error.
     */
    public generate(options: MidiGenerationOptions): MidiGenerationResult {
        const {
            progressionString,
            outputFileName = 'progression', // Default filename
            addBassNote,
            inversionType,
            baseOctave,
            chordDurationStr,
            tempo,
            velocity
        } = options;

        if (!progressionString || progressionString.trim() === '') {
            throw new Error("Chord progression cannot be empty.");
        }

        const finalFileName = outputFileName.endsWith('.mid') ? outputFileName : `${outputFileName}.mid`;
        const chordDurationTicks = this.getDurationTicks(chordDurationStr);

        const track = new midiWriterJs.Track();
        track.setTempo(tempo);
        track.setTimeSignature(4, 4, 24, 8);

        const notesForPianoRoll: NoteData[] = [];
        let currentTick = 0;
        let previousChordVoicing: number[] | null = null; // Store the previous chord's final voicing

        const chordSymbols = progressionString.trim().split(/\s+/);
        const chordRegex = /^([A-G][#b]?)(.*)$/;

        for (const symbol of chordSymbols) {
            if (!symbol) continue;
            const match = symbol.match(chordRegex);

            if (!match) {
                console.warn(`Could not parse chord symbol: "${symbol}". Skipping (adding rest).`);
                track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                currentTick += chordDurationTicks;
                previousChordVoicing = null; // Reset previous voicing on parse error
                continue;
            }

            const rootNoteName = match[1];
            let qualityAndExtensions = match[2];

            try {
                const rootMidi = this.getMidiNote(rootNoteName, baseOctave);
                let formulaIntervals = CHORD_FORMULAS[qualityAndExtensions];

                if (formulaIntervals === undefined) {
                     if (qualityAndExtensions === '') {
                        formulaIntervals = CHORD_FORMULAS['maj'];
                        qualityAndExtensions = 'maj';
                    } else {
                        console.warn(`Chord quality "${qualityAndExtensions}" not found for "${symbol}". Defaulting to major triad.`);
                        formulaIntervals = CHORD_FORMULAS['maj'];
                    }
                }

                // Calculate root position notes first
                let rootPositionNotes = formulaIntervals.map(intervalSemitones => rootMidi + intervalSemitones)
                                                     .sort((a, b) => a - b); // Ensure sorted

                let currentChordVoicing = [...rootPositionNotes]; // Start with root position

                // --- Inversion Logic ---
                if (inversionType === 'first' && currentChordVoicing.length > 1) {
                    // Simple first inversion (lowest note up octave)
                    const lowestNote = currentChordVoicing.shift();
                    if (lowestNote !== undefined) {
                        currentChordVoicing.push(lowestNote + 12);
                    }
                    currentChordVoicing.sort((a, b) => a - b);
                } else if (inversionType === 'smooth' && previousChordVoicing && currentChordVoicing.length > 1) {
                    // Smooth voice leading: find best inversion relative to previous chord
                    const possibleInversions = this.generateInversions(rootPositionNotes);
                    let bestVoicing = currentChordVoicing; // Default to root if calculation fails
                    let minDistance = Infinity;

                    for (const inversion of possibleInversions) {
                        const distance = this.calculateVoicingDistance(previousChordVoicing, inversion);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestVoicing = inversion;
                        }
                    }
                    currentChordVoicing = bestVoicing; // Use the smoothest voicing found
                }
                // If inversionType is 'none', currentChordVoicing remains root position

                // --- Bass Note ---
                let eventMidiNotes = [...currentChordVoicing]; // Use the potentially inverted voicing
                if (addBassNote) {
                    const bassNoteMidi = this.getMidiNote(rootNoteName, baseOctave - 1); // Bass note relative to root, one octave lower
                    if (bassNoteMidi >= 0) {
                         // Add bass note if it's not already the lowest note in the chord
                         if (!eventMidiNotes.length || bassNoteMidi < Math.min(...eventMidiNotes)) {
                            eventMidiNotes.unshift(bassNoteMidi);
                         }
                    } else {
                        console.warn(`Calculated bass note ${bassNoteMidi} for ${symbol} is below MIDI range 0. Skipping bass note.`);
                    }
                }

                // Filter out out-of-range notes and duplicates AFTER inversion and bass note logic
                eventMidiNotes = eventMidiNotes.filter(note => note >= 0 && note <= 127);
                eventMidiNotes = [...new Set(eventMidiNotes)].sort((a, b) => a - b); // Remove duplicates and sort final notes

                // --- Add MIDI Event ---
                if (eventMidiNotes.length > 0) {
                    eventMidiNotes.forEach(midiNote => {
                        notesForPianoRoll.push({
                            midiNote: midiNote,
                            startTimeTicks: currentTick,
                            durationTicks: chordDurationTicks,
                            velocity: velocity
                        });
                    });
                    track.addEvent(new midiWriterJs.NoteEvent({
                        pitch: eventMidiNotes,
                        duration: 'T' + chordDurationTicks,
                        velocity: velocity
                    }));
                    // Store the main chord voicing (WITHOUT bass note) for the next iteration's comparison
                    previousChordVoicing = [...currentChordVoicing];
                } else {
                    console.warn(`No valid MIDI notes generated for chord "${symbol}". Adding rest.`);
                    track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                    previousChordVoicing = null; // Reset if no notes generated
                }
                currentTick += chordDurationTicks;

            } catch (error: any) {
                console.error(`Error processing chord "${symbol}": ${error.message}. Adding rest.`);
                track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordDurationTicks, duration: 'T0', velocity: 0 }));
                currentTick += chordDurationTicks;
                previousChordVoicing = null; // Reset on error
            }
        } // End chord loop

        // Generate MIDI Blob
        const writer = new midiWriterJs.Writer([track]);
        const midiDataBytes = writer.buildFile(); // Get byte array
        const midiBlob = new Blob([midiDataBytes], { type: 'audio/midi' });

        return { notesForPianoRoll, midiBlob, finalFileName };
    }
}

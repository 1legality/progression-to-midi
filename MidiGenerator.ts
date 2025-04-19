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
const OCTAVE_ADJUSTMENT_THRESHOLD = 6; // Adjust if average pitch is > 6 semitones (half octave) away from target

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

// Intermediate structure to hold chord data during generation
interface ChordGenerationData {
    symbol: string;
    startTimeTicks: number;
    durationTicks: number;
    initialVoicing: number[]; // Voicing after root/smooth logic
    adjustedVoicing: number[]; // Voicing after octave adjustment
    rootNoteName: string;
    isValid: boolean;
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
        return midiVal;
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
        const sorted1 = [...voicing1].sort((a, b) => a - b);
        const sorted2 = [...voicing2].sort((a, b) => a - b);
        let totalDistance = 0;
        const minLength = Math.min(sorted1.length, sorted2.length);
        const maxLength = Math.max(sorted1.length, sorted2.length);
        for (let i = 0; i < minLength; i++) { totalDistance += Math.abs(sorted1[i] - sorted2[i]); }
        const noteCountDifference = maxLength - minLength;
        totalDistance += noteCountDifference * 6; // Penalty factor
        return totalDistance;
    }

    /**
     * Adjusts chord voicings to be closer to the target octave.
     * @param voicings - Array of chord voicings (arrays of MIDI notes).
     * @param baseOctave - The desired base octave (e.g., 3, 4).
     * @returns A new array with adjusted voicings.
     */
    private adjustVoicingsToTargetOctave(voicings: number[][], baseOctave: number): number[][] {
        if (!voicings || voicings.length === 0) {
            return [];
        }

        // Target the C note in the base octave as the center
        const targetCenterPitch = this.getMidiNote('C', baseOctave); // e.g., C4 = 60

        return voicings.map(voicing => {
            if (!voicing || voicing.length === 0) {
                return []; // Keep empty voicings as they are
            }

            // Calculate average pitch of the current voicing
            const sum = voicing.reduce((acc, note) => acc + note, 0);
            const averagePitch = sum / voicing.length;

            // Calculate difference from target center and determine octave shift needed
            const difference = averagePitch - targetCenterPitch;
            const octaveShift = Math.round(difference / 12); // Number of octaves to shift

            if (octaveShift !== 0) {
                // Apply the shift only if it's significant enough (avoids tiny adjustments)
                // And check if the shift keeps notes within a reasonable range (e.g. 0-127)
                // We use the threshold defined earlier
                if (Math.abs(difference) > OCTAVE_ADJUSTMENT_THRESHOLD) {
                    const semitoneShift = octaveShift * -12; // Shift in opposite direction of difference
                    const adjustedVoicing = voicing.map(note => note + semitoneShift);

                    // Basic check to prevent shifting notes completely out of MIDI range
                    const minNote = Math.min(...adjustedVoicing);
                    const maxNote = Math.max(...adjustedVoicing);
                    if (minNote >= 0 && maxNote <= 127) {
                        // console.log(`Adjusting voicing avg ${averagePitch.toFixed(1)} towards ${targetCenterPitch} by ${semitoneShift} semitones.`);
                        return adjustedVoicing.sort((a, b) => a - b);
                    } else {
                        // console.log(`Skipping adjustment for voicing avg ${averagePitch.toFixed(1)} - shift ${semitoneShift} would go out of range.`);
                        return voicing; // Keep original if shift goes out of bounds
                    }
                }
            }
            // No significant shift needed, return original voicing
            return voicing;
        });
    }

    /**
     * Generates MIDI data and note array from provided options.
     * @param options - The settings for MIDI generation.
     * @returns Object containing notesForPianoRoll, midiBlob, and finalFileName, or throws an error.
     */
    public generate(options: MidiGenerationOptions): MidiGenerationResult {
        const {
            progressionString,
            outputFileName = 'progression',
            addBassNote,
            inversionType,
            baseOctave,
            chordDurationStr,
            tempo,
            velocity
            // adjustOctaves // Removed from destructuring
        } = options;

        if (!progressionString || progressionString.trim() === '') {
            throw new Error("Chord progression cannot be empty.");
        }

        const finalFileName = outputFileName.endsWith('.mid') ? outputFileName : `${outputFileName}.mid`;
        const chordDurationTicks = this.getDurationTicks(chordDurationStr);
        const chordSymbols = progressionString.trim().split(/\s+/);
        const chordRegex = /^([A-G][#b]?)(.*)$/;

        const generatedChords: ChordGenerationData[] = [];
        let currentTick = 0;
        let previousChordVoicing: number[] | null = null;

        // --- Step 1: Generate Initial Voicings (Root or Smoothed) ---
        for (const symbol of chordSymbols) {
            if (!symbol) continue;
            const match = symbol.match(chordRegex);
            let chordData: ChordGenerationData = {
                symbol: symbol,
                startTimeTicks: currentTick,
                durationTicks: chordDurationTicks,
                initialVoicing: [],
                adjustedVoicing: [],
                rootNoteName: '',
                isValid: false
            };

            if (!match) {
                console.warn(`Could not parse chord symbol: "${symbol}". Skipping.`);
                generatedChords.push(chordData);
                currentTick += chordDurationTicks;
                previousChordVoicing = null;
                continue;
            }

            const rootNoteName = match[1];
            let qualityAndExtensions = match[2];
            chordData.rootNoteName = rootNoteName;

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

                let rootPositionNotes = formulaIntervals.map(intervalSemitones => rootMidi + intervalSemitones)
                    .sort((a, b) => a - b);

                let currentChordVoicing = [...rootPositionNotes];

                // Apply inversion logic based on type
                if (inversionType === 'first' && currentChordVoicing.length > 1) {
                    const lowestNote = currentChordVoicing.shift();
                    if (lowestNote !== undefined) { currentChordVoicing.push(lowestNote + 12); }
                    currentChordVoicing.sort((a, b) => a - b);
                } else if (inversionType === 'smooth' && previousChordVoicing && currentChordVoicing.length > 1) {
                    const possibleInversions = this.generateInversions(rootPositionNotes);
                    let bestVoicing = currentChordVoicing;
                    let minDistance = Infinity;
                    for (const inversion of possibleInversions) {
                        const distance = this.calculateVoicingDistance(previousChordVoicing, inversion);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestVoicing = inversion;
                        }
                    }
                    currentChordVoicing = bestVoicing;
                }

                chordData.initialVoicing = [...currentChordVoicing];
                chordData.isValid = true;
                previousChordVoicing = [...currentChordVoicing];

            } catch (error: any) {
                console.error(`Error processing chord "${symbol}": ${error.message}.`);
                previousChordVoicing = null;
                // chordData remains isValid = false
            }

            generatedChords.push(chordData);
            currentTick += chordDurationTicks;
        } // End Step 1 loop

        // --- Step 2: Apply Post-Processing Octave Adjustment (Implicitly for 'smooth') ---
        let finalVoicings: number[][];
        // *** CHANGE HERE: Adjust if inversionType is 'smooth' ***
        if (inversionType === 'smooth') {
            const initialVoicings = generatedChords.map(cd => cd.initialVoicing);
            finalVoicings = this.adjustVoicingsToTargetOctave(initialVoicings, baseOctave);
        } else {
            // For 'none' or 'first', just use the initial voicings directly
            finalVoicings = generatedChords.map(cd => cd.initialVoicing);
        }

        // Store adjusted voicings back into generatedChords for convenience
        generatedChords.forEach((cd, index) => {
            cd.adjustedVoicing = finalVoicings[index] || []; // Handle potential empty arrays
        });


        // --- Step 3: Build MIDI Track and Piano Roll Data from Final Voicings ---
        const track = new midiWriterJs.Track();
        track.setTempo(tempo);
        track.setTimeSignature(4, 4, 24, 8);
        const notesForPianoRoll: NoteData[] = [];

        for (const chordData of generatedChords) {
            if (!chordData.isValid || chordData.adjustedVoicing.length === 0) {
                track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordData.durationTicks, duration: 'T0', velocity: 0 }));
                continue;
            }

            let eventMidiNotes = [...chordData.adjustedVoicing];

            // Add bass note if requested
            if (addBassNote) {
                const bassNoteMidi = this.getMidiNote(chordData.rootNoteName, baseOctave - 1);
                if (bassNoteMidi >= 0 && bassNoteMidi <= 127) {
                    if (!eventMidiNotes.length || bassNoteMidi < Math.min(...eventMidiNotes)) {
                        eventMidiNotes.unshift(bassNoteMidi);
                    }
                } else {
                    console.warn(`Calculated bass note ${bassNoteMidi} for ${chordData.symbol} is out of MIDI range 0-127. Skipping bass note.`);
                }
            }

            // Final filtering: ensure all notes are within MIDI range 0-127 and remove duplicates
            eventMidiNotes = eventMidiNotes
                .filter(note => note >= 0 && note <= 127)
                .sort((a, b) => a - b);
            eventMidiNotes = [...new Set(eventMidiNotes)];

            if (eventMidiNotes.length > 0) {
                eventMidiNotes.forEach(midiNote => {
                    notesForPianoRoll.push({
                        midiNote: midiNote,
                        startTimeTicks: chordData.startTimeTicks,
                        durationTicks: chordData.durationTicks,
                        velocity: velocity
                    });
                });
                track.addEvent(new midiWriterJs.NoteEvent({
                    pitch: eventMidiNotes,
                    duration: 'T' + chordData.durationTicks,
                    velocity: velocity
                }));
            } else {
                console.warn(`No valid MIDI notes remained for chord "${chordData.symbol}" after final filtering. Adding rest.`);
                track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordData.durationTicks, duration: 'T0', velocity: 0 }));
            }
        } // End Step 3 loop


        // --- Step 4: Generate MIDI Blob ---
        const writer = new midiWriterJs.Writer([track]);
        const midiDataBytes = writer.buildFile();
        const midiBlob = new Blob([midiDataBytes], { type: 'audio/midi' });

        return { notesForPianoRoll, midiBlob, finalFileName };
    }
}

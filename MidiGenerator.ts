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
        // Ensure note is within reasonable bounds, though final check happens later
        if (midiVal < 0 || midiVal > 127) {
             console.warn(`Calculated MIDI note ${midiVal} for ${noteName}${octave} is outside the standard 0-127 range.`);
             // Return a value that will likely be filtered out later, or clamp/throw error
             return midiVal; // Keep the value for now, filter later
        }
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
            // Only adjust if the average is significantly far from the target
            if (Math.abs(difference) > OCTAVE_ADJUSTMENT_THRESHOLD) {
                const octaveShift = Math.round(difference / 12); // Number of octaves to shift
                if (octaveShift !== 0) {
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
                        return voicing.sort((a, b) => a - b); // Keep original if shift goes out of bounds, but ensure sorted
                    }
                }
            }
            // No significant shift needed, return original voicing (ensure sorted)
            return voicing.sort((a, b) => a - b);
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
                } else if (inversionType === 'smooth') {
                    if (!previousChordVoicing && currentChordVoicing.length > 1) {
                        currentChordVoicing = this.adjustVoicingsToTargetOctave([currentChordVoicing], baseOctave)[0];
                    } else if (previousChordVoicing && currentChordVoicing.length > 1) {
                        const possibleInversions = this.generateInversions(rootPositionNotes);
                        let bestVoicing = currentChordVoicing;
                        let minDistance = Infinity;
                        for (const inversion of possibleInversions) {
                            const adjustedInversion = this.adjustVoicingsToTargetOctave([inversion], baseOctave)[0];
                            const distance = this.calculateVoicingDistance(previousChordVoicing, adjustedInversion);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestVoicing = adjustedInversion;
                            }
                        }
                        currentChordVoicing = bestVoicing;
                    }
                }

                chordData.initialVoicing = [...currentChordVoicing]; // Store the result of inversion/smoothing
                chordData.isValid = true;
                previousChordVoicing = [...currentChordVoicing]; // Update previous for next iteration's smoothing

            } catch (error: any) {
                console.error(`Error processing chord "${symbol}": ${error.message}.`);
                previousChordVoicing = null;
                // chordData remains isValid = false
            }

            generatedChords.push(chordData);
            currentTick += chordDurationTicks;
        } // End Step 1 loop


        // --- Step 2: Apply Post-Processing Octave Adjustment (if not already done during 'smooth') ---
        // Note: 'smooth' now adjusts during the smoothing process itself to compare like-with-like octaves.
        // We still need to adjust 'none' and 'first' inversions here.
        let finalVoicings: number[][];
        if (inversionType === 'none' || inversionType === 'first') {
            const initialVoicings = generatedChords.map(cd => cd.initialVoicing);
            finalVoicings = this.adjustVoicingsToTargetOctave(initialVoicings, baseOctave);
        } else { // 'smooth' voicings are already adjusted relative to the previous chord
            finalVoicings = generatedChords.map(cd => cd.initialVoicing); // Use the already-adjusted initialVoicing
        }

        // Store final voicings back into generatedChords
        generatedChords.forEach((cd, index) => {
            // Ensure the final voicing is sorted, especially after potential adjustments
            cd.adjustedVoicing = (finalVoicings[index] || []).sort((a, b) => a - b);
        });


        // --- Step 3: Build MIDI Track and Piano Roll Data from Final Voicings ---
        const track = new midiWriterJs.Track();
        track.setTempo(tempo);
        track.setTimeSignature(4, 4, 24, 8);
        const notesForPianoRoll: NoteData[] = [];

        for (const chordData of generatedChords) {
            if (!chordData.isValid || chordData.adjustedVoicing.length === 0) {
                // Add a rest if the chord is invalid or ended up with no notes
                track.addEvent(new midiWriterJs.NoteEvent({ pitch: [], wait: 'T' + chordData.durationTicks, duration: 'T0', velocity: 0 }));
                continue;
            }

            let eventMidiNotes = [...chordData.adjustedVoicing]; // Start with the adjusted chord notes

            // --- Add Bass Note Logic ---
            if (addBassNote) {
                const minNoteInVoicing = Math.min(...eventMidiNotes);
                let chosenBassNoteMidi: number | null = null;

                if (inversionType === 'smooth') {
                    const potentialBassNotes: { note: number; distance: number }[] = [];
                    for (let octave = baseOctave; octave >= 0; octave--) {
                        const potentialBass = this.getMidiNote(chordData.rootNoteName, octave);
                        if (potentialBass < minNoteInVoicing && potentialBass >= 0) {
                            potentialBassNotes.push({ note: potentialBass, distance: minNoteInVoicing - potentialBass });
                        } else if (potentialBass < 0) {
                            break;
                        }
                    }

                    if (potentialBassNotes.length > 0) {
                        potentialBassNotes.sort((a, b) => a.distance - b.distance);
                        chosenBassNoteMidi = potentialBassNotes[0].note;
                    } else {
                        const fallbackBass = this.getMidiNote(chordData.rootNoteName, baseOctave - 1);
                        if (fallbackBass >= 0 && fallbackBass <= 127 && fallbackBass < minNoteInVoicing) {
                            chosenBassNoteMidi = fallbackBass;
                        }
                    }
                } else {
                    const standardBassNote = this.getMidiNote(chordData.rootNoteName, baseOctave - 1);
                    if (standardBassNote >= 0 && standardBassNote <= 127) {
                        chosenBassNoteMidi = standardBassNote;
                    }
                }

                if (chosenBassNoteMidi !== null && !eventMidiNotes.includes(chosenBassNoteMidi)) {
                    eventMidiNotes.push(chosenBassNoteMidi);
                }
            } // --- End Add Bass Note Logic ---


            // Final filtering and sorting: ensure all notes are within MIDI range 0-127 and remove duplicates
            eventMidiNotes = eventMidiNotes
                .filter(note => note >= 0 && note <= 127)
                .sort((a, b) => a - b);
            eventMidiNotes = [...new Set(eventMidiNotes)]; // Remove duplicates after sorting

            if (eventMidiNotes.length > 0) {
                // Add notes to piano roll data
                eventMidiNotes.forEach(midiNote => {
                    notesForPianoRoll.push({
                        midiNote: midiNote,
                        startTimeTicks: chordData.startTimeTicks,
                        durationTicks: chordData.durationTicks,
                        velocity: velocity
                    });
                });
                // Add MIDI event
                track.addEvent(new midiWriterJs.NoteEvent({
                    pitch: eventMidiNotes,
                    duration: 'T' + chordData.durationTicks,
                    velocity: velocity
                }));
            } else {
                // Add a rest if filtering removed all notes
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

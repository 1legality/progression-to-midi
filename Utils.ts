// Utils.ts
// Shared utility functions for note name normalization, MIDI note conversion, and input parsing

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Normalizes a note name (e.g., Db -> C#, Fb -> E, etc.)
 */
export function normalizeNoteName(note: string): string {
    const name = note.toUpperCase();
    switch (name) {
        case 'DB': return 'C#';
        case 'EB': return 'D#';
        case 'FB': return 'E';
        case 'GB': return 'F#';
        case 'AB': return 'G#';
        case 'BB': return 'A#';
        case 'E#': return 'F';
        case 'B#': return 'C';
        default: return name;
    }
}

/**
 * Gets the MIDI note number for a note name and octave (e.g., C4 = 60)
 */
export function getMidiNote(noteName: string, octave: number): number {
    const normalized = normalizeNoteName(noteName);
    const index = NOTES.indexOf(normalized);
    if (index === -1) {
        throw new Error(`Invalid note name: ${noteName}`);
    }
    return 12 * (octave + 1) + index;
}

/**
 * Converts a MIDI note number to note name and octave (e.g., 60 -> C4)
 */
export function getNoteNameFromMidi(midiNote: number): string {
    const note = NOTES[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${note}${octave}`;
}

import { jsPDF } from 'jspdf';
import { MidiGenerator, MidiGenerationOptions } from './MidiGenerator';

/**
 * Export a chord progression to PDF.
 * - Uses MidiGenerator.generate(...) to obtain chord details (voicings, bass note, etc).
 * - Renders a header with the progression string and one 4-octave keyboard row per chord.
 * - Respects outputType and inversionType by selecting which notes are highlighted.
 *
 * Returns a Blob for the generated PDF (caller may trigger a download).
 */
export async function exportProgressionToPdf(options: MidiGenerationOptions): Promise<Blob> {
    const midiGenerator = new MidiGenerator();
    const generationResult = midiGenerator.generate(options);
    const chordDetails: any[] = (generationResult as any).chordDetails || [];
    const progressionTitle = (options.progressionString || '').trim() || 'Progression';

    // Create jsPDF (portrait, points)
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 36;
    let y = margin;

    // Header (centered)
    doc.setFontSize(20);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setTextColor(0);
    doc.text(` ${progressionTitle}`, pageWidth / 2, y + 6, { align: 'center' });
    y += 36;

    // Per-chord layout metrics
    let rowHeight = 110; // base row height
    const whiteKeyWidth = 12; // nominal
    const whiteKeyHeight = 56; // nominal
    const blackKeyWidth = Math.round(whiteKeyWidth * 0.6);
    const blackKeyHeight = Math.round(whiteKeyHeight * 0.62);
    const keysOctaves = 4; // use 4 octaves
    const whiteKeysPerOctave = 7;
    const totalWhiteKeys = whiteKeysPerOctave * keysOctaves;
    const keyboardWidth = totalWhiteKeys * whiteKeyWidth;
    const labelWidth = 40;
    const usableWidth = pageWidth - margin * 2;

    // Increase scale up to ~35% and make keys taller by 25%
    const scaleCap = 1.35;
    // Use most of the usable width for the keyboard (ignore small label area) so keys scale up to fill more of the page
    const scale = Math.min(scaleCap, Math.max(0.6, (usableWidth - 20) / keyboardWidth));
    const heightMultiplier = 1.25;

    const drawWhiteKeyW = whiteKeyWidth * scale;
    const drawWhiteKeyH = whiteKeyHeight * scale * heightMultiplier;
    const drawBlackKeyW = blackKeyWidth * scale;
    const drawBlackKeyH = blackKeyHeight * scale * heightMultiplier;

    // increase row height to accommodate taller keys
    rowHeight = Math.round((drawWhiteKeyH + 36) );
    const gapBetweenRows = 28;

    // Note name helper
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midiToNoteLabel = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

    // Helper: semitone positions considered black within an octave
    const isBlackInOctave = (semitone: number) => {
        const s = semitone % 12;
        return [1, 3, 6, 8, 10].includes(s);
    };

    // Iterate chords
    for (let i = 0; i < chordDetails.length; i++) {
        const chord = chordDetails[i];

        // Add page if needed
        if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            // redraw header on new page
            y = margin;
            doc.setFontSize(20);
            doc.setTextColor(0);
            doc.text(` ${progressionTitle}`, pageWidth / 2, y + 6, { align: 'center' });
            y += 36;
        }

        // Determine keyboard base MIDI so the notes fit within 4 octaves
        const outputType = options.outputType;
        let highlightNotes: number[] = [];

        if (!chord || !chord.isValid) {
            highlightNotes = [];
        } else {
            switch (outputType) {
                case 'bassOnly':
                    if (chord.calculatedBassNote !== null) highlightNotes = [chord.calculatedBassNote];
                    break;
                case 'bassAndFifth':
                    if (chord.calculatedBassNote !== null) highlightNotes = [chord.calculatedBassNote, chord.calculatedBassNote + 7];
                    break;
                case 'chordsOnly':
                    highlightNotes = Array.isArray(chord.adjustedVoicing) ? [...chord.adjustedVoicing] : [];
                    break;
                case 'chordsAndBass':
                    highlightNotes = Array.isArray(chord.adjustedVoicing) ? [...chord.adjustedVoicing] : [];
                    if (chord.calculatedBassNote !== null && !highlightNotes.includes(chord.calculatedBassNote)) {
                        highlightNotes.push(chord.calculatedBassNote);
                    }
                    break;
                case 'notesOnly':
                default:
                    highlightNotes = Array.isArray(chord.adjustedVoicing) ? [...chord.adjustedVoicing] : [];
                    break;
            }
        }

        const allNotes = highlightNotes.filter(n => typeof n === 'number' && !isNaN(n));
        let minNote = allNotes.length ? Math.min(...allNotes) : 60;
        let maxNote = allNotes.length ? Math.max(...allNotes) : 60;

        // Choose base midi so min and max fit into keysOctaves * 12 semitones
        // Prefer to start at C1 (MIDI 24) when possible so the first octave is used; only shift up if necessary
        const C1 = 24;
        let baseMidi = C1;
        if (baseMidi + 12 * keysOctaves - 1 < maxNote) {
            // shift up so maxNote fits within the window
            baseMidi = Math.max(0, Math.floor((maxNote - (12 * keysOctaves - 1)) / 12) * 12);
        }
        if (baseMidi < 0) baseMidi = 0;
        if (baseMidi + 12 * keysOctaves - 1 > 127) baseMidi = 127 - (12 * keysOctaves - 1);

        // Draw keyboard centered horizontally in usable area
        const kbY = y + 18;
        const keyboardDrawWidth = totalWhiteKeys * drawWhiteKeyW;
        const kbX = margin + Math.max(0, (usableWidth - keyboardDrawWidth) / 2);

        // Map semitone index -> white index for horizontal pos
        let whiteIndex = 0;
        const midiToWhiteIndex: Record<number, number> = {};
        for (let s = 0; s < keysOctaves * 12; s++) {
            const midi = baseMidi + s;
            if (!isBlackInOctave(s)) {
                midiToWhiteIndex[midi] = whiteIndex++;
            }
        }

        // Chord label centered above the keyboard
        const chordLabel = chord && chord.symbol ? chord.symbol : '(rest)';
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(chordLabel, kbX + keyboardDrawWidth / 2, y + 8, { align: 'center' });

        // Draw white keys (with small note labels underneath)
        doc.setDrawColor(50);
        doc.setLineWidth(0.6);
        doc.setFontSize(8);
        for (let s = 0; s < keysOctaves * 12; s++) {
            const midi = baseMidi + s;
            if (!isBlackInOctave(s)) {
                const wIdx = midiToWhiteIndex[midi];
                const x = kbX + wIdx * drawWhiteKeyW;
                const yTop = kbY;
                const isHighlighted = highlightNotes.includes(midi);
                if (isHighlighted) {
                    doc.setFillColor(220, 235, 255);
                    doc.rect(x, yTop, drawWhiteKeyW, drawWhiteKeyH, 'F');
                } else {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(x, yTop, drawWhiteKeyW, drawWhiteKeyH, 'F');
                }
                // key border
                doc.setDrawColor(160);
                doc.rect(x, yTop, drawWhiteKeyW, drawWhiteKeyH, 'S');

                // note label inside the key near the bottom (short form like C3)
                const label = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
                doc.setFontSize(7);
                doc.setTextColor(80);
                // place label a few points above the key bottom
                doc.text(label, x + drawWhiteKeyW / 2, yTop + drawWhiteKeyH - 4, { align: 'center' });
             }
         }

        // Draw black keys over the white keys
        for (let s = 0; s < keysOctaves * 12; s++) {
            if (isBlackInOctave(s)) {
                const midi = baseMidi + s;
                // Find the white key to the left: previous semitone will be white
                let leftSemitone = s - 1;
                while (leftSemitone >= 0 && isBlackInOctave(leftSemitone)) leftSemitone--;
                const leftMidi = baseMidi + leftSemitone;
                const leftWhiteIdx = midiToWhiteIndex[leftMidi] ?? 0;
                const x = kbX + (leftWhiteIdx + 1) * drawWhiteKeyW - drawBlackKeyW / 2;
                const yTop = kbY;
                const isHighlighted = highlightNotes.includes(midi);
                if (isHighlighted) {
                    doc.setFillColor(160, 210, 255);
                    doc.rect(x, yTop, drawBlackKeyW, drawBlackKeyH, 'F');
                } else {
                    doc.setFillColor(0, 0, 0);
                    doc.rect(x, yTop, drawBlackKeyW, drawBlackKeyH, 'F');
                }
                // subtle border
                doc.setDrawColor(0);
                doc.rect(x, yTop, drawBlackKeyW, drawBlackKeyH, 'S');
            }
        }

        // --- Add pad-style "square" keyboard (four octaves) as an alternate visual ---
        // Keep the original keyboard above and draw the pads in 2 rows (Torso T1 style).
        const squareSize = Math.min(drawWhiteKeyW, drawWhiteKeyH);
        // increase spacing so octave boundaries are visible
        const octaveGap = Math.round(squareSize * 0.8);
        const totalSemitones = keysOctaves * 12;

        // Two rows: split octaves evenly across rows (for 4 octaves -> 2 octaves per row)
        const rowOctaves = Math.ceil(keysOctaves / 2); // octaves per row
        const rows = Math.ceil(keysOctaves / rowOctaves); // number of rows (should be 2)
        const rowWidth = rowOctaves * 12 * squareSize + Math.max(0, (rowOctaves - 1) * octaveGap);
        const padX = margin + Math.max(0, (usableWidth - rowWidth) / 2);

        // place pads below the piano keyboard, give a bit more vertical space
        const padTopY = kbY + drawWhiteKeyH + 14;
        const padRowGap = Math.round(squareSize * 0.9); // vertical gap between pad rows
        const padHeight = squareSize;

        doc.setLineWidth(0.8);
        for (let s = 0; s < totalSemitones; s++) {
            const midi = baseMidi + s;
            const octaveIndex = Math.floor(s / 12);
            const semitoneInOctave = s % 12;

            // rowIndex: which of the stacked rows (0..rows-1)
            const rowIndex = Math.floor(octaveIndex / rowOctaves);
            // column within that row (0..rowOctaves-1)
            const colInRow = octaveIndex % rowOctaves;

            const x = padX + colInRow * (12 * squareSize + octaveGap) + semitoneInOctave * squareSize;
            const yTop = padTopY + rowIndex * (padHeight + padRowGap);

            const isBlack = isBlackInOctave(semitoneInOctave);
            const isHighlighted = highlightNotes.includes(midi);

            if (isHighlighted) {
                // highlighted note color (dot also drawn below)
                doc.setFillColor(250, 200, 80);
            } else if (isBlack) {
                // black semitone pads shown blue
                doc.setFillColor(100, 150, 255);
            } else {
                // white semitone pads shown light grey
                doc.setFillColor(245, 245, 245);
            }

            doc.rect(x, yTop, squareSize, padHeight, 'F');
            doc.setDrawColor(120);
            doc.rect(x, yTop, squareSize, padHeight, 'S');

            // optional small marker for highlighted notes (centered dot)
            if (isHighlighted) {
                doc.setFillColor(60, 60, 60);
                const cx = x + squareSize / 2;
                const cy = yTop + padHeight / 2;
                doc.circle(cx, cy, Math.max(1.5, squareSize * 0.08), 'F');
            }

            // small label under each pad in the same row as the pad
            doc.setFontSize(7);
            doc.setTextColor(60);
            const label = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
            doc.text(label, x + squareSize / 2, yTop + padHeight + 9, { align: 'center' });
        }

        // move ASCII tab down to sit under the pad rows (give a bit of spacing)
        const tabY = padTopY + rows * padHeight + (rows - 1) * padRowGap + 12;
        doc.setFontSize(12);
        doc.setTextColor(0);

        const TAB_LINE_HEIGHT = 12;
        const asciiTabStartY = tabY + 14;

        function generateAsciiTab(ch: any): string[] {
            const openStrings = [64, 59, 55, 50, 45, 40]; // high -> low
            const MAX_FRET = 20;
            const lines: string[] = [];

            if (!ch || !ch.isValid || !Array.isArray(ch.adjustedVoicing) || ch.adjustedVoicing.length === 0) {
                // empty 6-line placeholder (leave lines empty, no 0 or x)
                for (let i = 0; i < 6; i++) lines.push('-----');
                return lines;
            }

            const chordNotes: number[] = ch.adjustedVoicing.filter((n: any) => typeof n === 'number');

            for (const open of openStrings) {
                let bestFret: number | null = null;
                let bestDistance = 999;
                let bestMidi: number | null = null;

                for (const note of chordNotes) {
                    // consider multiple octaves around the note to find a playable fret on this string
                    for (let octaveShift = -2; octaveShift <= 2; octaveShift++) {
                        const candidate = note + octaveShift * 12;
                        const fret = candidate - open;
                        if (fret >= 0 && fret <= MAX_FRET) {
                            const dist = Math.abs(fret); // prefer lower frets
                            if (dist < bestDistance) {
                                bestDistance = dist;
                                bestFret = fret;
                                bestMidi = candidate;
                            }
                        }
                    }
                }

                if (bestFret === null) {
                    // not used -> leave empty-looking tab line (no 0, no x)
                    lines.push('-----');
                } else {
                    // append note letter (lowercase) to the right, e.g. "--3--b"
                    const midiForName = bestMidi ?? (open + bestFret);
                    const noteName = NOTE_NAMES[midiForName % 12].toLowerCase();
                    lines.push(`--${bestFret}--${noteName}`);
                }
            }

            return lines;
        }

        const tabLines = generateAsciiTab(chord);

        // Print the ASCII tab lines (top-to-bottom = high E -> low E)
        doc.setFont('courier');
        doc.setFontSize(10);
        for (let i = 0; i < tabLines.length; i++) {
            const line = tabLines[i];
            doc.text(line, kbX, asciiTabStartY + i * TAB_LINE_HEIGHT);
        }
        // restore default font for subsequent content
        doc.setFont('helvetica');

        // Update y position for next chord (leave some space after tab)
        y = asciiTabStartY + tabLines.length * TAB_LINE_HEIGHT + 18;
    } // end chords loop

    // Finalize PDF -> Blob
    const arrayBuffer = doc.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    return blob;
}
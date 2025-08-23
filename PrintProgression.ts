import { jsPDF } from 'jspdf';
import { getMidiNote, getNoteNameFromMidi } from './Utils';
import { NOTES } from './MidiGenerator';
import type { MidiGenerationResult } from './MidiGenerator'; // <-- added import for typing

/**
 * Generates a printable PDF (A4 landscape) showing a 3-octave piano for each chord step.
 * Each step is rendered as a "card" with the chord symbol and highlighted keys (blue).
 *
 * @param chordDetails - Array of chord detail objects returned by [`MidiGenerator.generate`](MidiGenerator.ts).
 *                       Each item should include .symbol and .adjustedVoicing (array of midi numbers).
 * @param baseOctave - Starting octave for the 3-octave keyboard (default 4 => C4..B6)
 * @param filename - Output filename for the generated PDF
 */
export function generatePdfProgression(
    chordDetails: { symbol?: string; adjustedVoicing?: number[] }[],
    baseOctave: number = 4,
    filename: string = 'chord_progression.pdf'
): void {
    if (!chordDetails || chordDetails.length === 0) {
        alert('No chord progression available to print.');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Layout settings
    const margin = 8;
    const gutter = 6;
    const cardsPerRow = 3;
    const cardW = (pageW - margin * 2 - gutter * (cardsPerRow - 1)) / cardsPerRow;
    const cardH = 60; // mm tall for keyboard + title
    let x = margin;
    let y = margin;

    // Helpers
    const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
    const midiStart = getMidiNote('C', baseOctave); // start of 3-octave range
    const midiEnd = midiStart + 12 * 3 - 1;
    const whitePerOctave = 7;
    const totalWhiteKeys = whitePerOctave * 3;

    function drawCard(cd: { symbol?: string; adjustedVoicing?: number[] }, posX: number, posY: number) {
        // Card border and title
        doc.setDrawColor(80);
        doc.setFillColor(255, 255, 255);
        doc.rect(posX, posY, cardW, cardH, 'F');
        doc.setFontSize(10);
        doc.setTextColor(30);
        const title = cd && cd.symbol ? cd.symbol : '(Step)';
        doc.text(title, posX + cardW / 2, posY + 6, { align: 'center' });

        // Keyboard area inside card
        const kbX = posX + 4;
        const kbY = posY + 10;
        const kbW = cardW - 8;
        const kbH = cardH - 14;

        // Compute white key width
        const whiteW = kbW / totalWhiteKeys;
        const whiteH = kbH;
        // Map white key x positions by iterating range
        const whitePositions = new Map<number, number>(); // midi -> x
        let whiteIndex = 0;
        for (let m = midiStart; m <= midiEnd; m++) {
            if (!isBlackKey(m)) {
                whitePositions.set(m, kbX + whiteIndex * whiteW);
                whiteIndex++;
            }
        }

        const active = (cd && cd.adjustedVoicing) ? cd.adjustedVoicing : [];

        // Draw white keys
        for (let m = midiStart; m <= midiEnd; m++) {
            if (!isBlackKey(m)) {
                const wx = whitePositions.get(m) as number;
                const isActive = active.includes(m);
                // Fill
                if (isActive) {
                    doc.setFillColor(200, 230, 255); // light blue
                    doc.rect(wx, kbY, whiteW, whiteH, 'F');
                } else {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(wx, kbY, whiteW, whiteH, 'F');
                }
                // Outline
                doc.setDrawColor(120);
                doc.rect(wx, kbY, whiteW, whiteH, 'S');
                // Label small note name under key
                doc.setFontSize(Math.max(6, whiteW * 0.18));
                doc.setTextColor(70);
                doc.text(getNoteNameFromMidi(m), wx + whiteW / 2, kbY + whiteH - 2, { align: 'center' });
            }
        }

        // Draw black keys on top
        const blackW = whiteW * 0.62;
        const blackH = whiteH * 0.62;
        for (let m = midiStart; m <= midiEnd; m++) {
            if (isBlackKey(m)) {
                // Find previous white key to position black key between whites
                let prev = m - 1;
                while (prev >= midiStart && isBlackKey(prev)) prev--;
                const px = whitePositions.get(prev) ?? (kbX);
                const bx = px + whiteW - blackW / 2;
                const isActive = active.includes(m);
                if (isActive) {
                    doc.setFillColor(40, 100, 180); // darker blue for active black key
                } else {
                    doc.setFillColor(30, 30, 30);
                }
                doc.rect(bx, kbY, blackW, blackH, 'F');
            }
        }
    }

    // Iterate chords and render cards, creating pages as needed
    chordDetails.forEach((cd, idx) => {
        drawCard(cd, x, y);
        x += cardW + gutter;
        if ((idx + 1) % cardsPerRow === 0) {
            // next row
            x = margin;
            y += cardH + gutter;
            // new page if needed
            if (y + cardH + margin > pageH) {
                doc.addPage();
                x = margin;
                y = margin;
            }
        }
    });

    // Save file
    doc.save(filename);
}

/**
 * Wire a UI print button to the PDF generator.
 * @param getLastResult - callback returning the latest MidiGenerationResult (or null)
 * @param opts - optional params: buttonId, baseOctaveSelectorId, filename, statusElement
 */
export function wirePrintButton(
    getLastResult: () => MidiGenerationResult | null,
    opts: {
        buttonId?: string;
        baseOctaveSelectorId?: string;
        filename?: string;
        statusElement?: HTMLElement | null;
    } = {}
): void {
    const buttonId = opts.buttonId ?? 'printProgressionButton';
    const baseOctSel = opts.baseOctaveSelectorId ?? 'baseOctave';
    const filename = opts.filename ?? 'progression.pdf';
    const statusEl = opts.statusElement ?? null;

    const printButton = document.getElementById(buttonId) as HTMLButtonElement | null;
    if (!printButton) {
        // No button found — nothing to wire
        return;
    }

    printButton.addEventListener('click', (e) => {
        e.preventDefault();
        const result = getLastResult();
        if (!result || !result.chordDetails || result.chordDetails.length === 0) {
            if (statusEl) {
                statusEl.textContent = 'No generated progression to print. Generate a preview first.';
                statusEl.className = 'mt-4 text-center text-danger';
            } else {
                alert('No generated progression to print. Generate a preview first.');
            }
            return;
        }

        const baseOctaveInput = document.getElementById(baseOctSel) as HTMLSelectElement | null;
        const baseOctave = baseOctaveInput ? parseInt(baseOctaveInput.value, 10) : 4;
        try {
            // generatePdfProgression is defined in this file
            generatePdfProgression(result.chordDetails, baseOctave, filename);
            if (statusEl) {
                statusEl.textContent = 'PDF generated.';
                statusEl.className = 'mt-4 text-center text-success';
            }
        } catch (err: any) {
            console.error('Failed to generate PDF:', err);
            if (statusEl) {
                statusEl.textContent = `Error generating PDF: ${err.message || err}`;
                statusEl.className = 'mt-4 text-center text-danger';
            } else {
                alert('Error generating PDF. See console.');
            }
        }
    });
}

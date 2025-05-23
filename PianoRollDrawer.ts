// PianoRollDrawer.ts

import { SynthChordPlayer } from './SynthChordPlayer';

// Define or import the ActiveNote interface
interface ActiveNote {
    midiNote: number;
    velocity: number;
    duration: number;
    oscillators: OscillatorNode[];
    noteGain: GainNode;
    stopTime: number;
}

interface NoteData {
    midiNote: number;
    startTimeTicks: number;
    durationTicks: number;
    velocity: number;
}

interface PianoRollOptions {
    noteColor?: string;
    backgroundColor?: string;
    gridColor?: string;
}

export class PianoRollDrawer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private options: Required<PianoRollOptions>; // Use Required to ensure all options have defaults
    private lastDrawnNotes: NoteData[] = []; // Store notes for redraw on resize
    private synthPlayer: SynthChordPlayer;

    constructor(canvas: HTMLCanvasElement, initialOptions: PianoRollOptions = {}) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            throw new Error("Could not get 2D context for canvas");
        }
        this.canvas = canvas;
        this.ctx = ctx;

        // Set default options
        this.options = {
            noteColor: initialOptions.noteColor ?? '#2563eb',      // Default blue notes
            backgroundColor: initialOptions.backgroundColor ?? '#f9fafb', // Default light gray background
            gridColor: initialOptions.gridColor ?? '#e5e7eb'       // Default lighter gray grid
        };

        this.resize(); // Initial resize
        this.synthPlayer = new SynthChordPlayer();
    }

    /**
     * Resizes the canvas drawing buffer to match its display size and DPR.
     * Also redraws the last drawn notes.
     */
    public resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        // Check if the canvas size actually changed to avoid unnecessary redraws
        if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;
            // Scale the context for drawing (important!)
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
         // Always redraw after resize attempt, as context transform might reset
         this.draw(this.lastDrawnNotes);
    }

    /**
     * Clears the canvas and draws the provided notes.
     * @param notesData - Array of notes to draw.
     */
    public draw(notesData: NoteData[]): void {
        this.lastDrawnNotes = notesData; // Store for redraws
        const { noteColor, backgroundColor, gridColor } = this.options;
        const dpr = window.devicePixelRatio || 1;

        // Use clientWidth/Height for calculations based on CSS pixels
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;

        // --- Clear Canvas ---
        // Clear using the *drawing buffer* size (canvas.width/height)
        // Need to save/restore transform to clear correctly if scaled
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for clearing
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore(); // Restore previous transform (scaled by DPR)

        if (notesData.length === 0) {
            this.drawEmptyMessage("No notes to display");
            return;
        }

        // --- Determine Range and Scale ---
        let minMidi = 127;
        let maxMidi = 0;
        let maxTimeTicks = 0;
        notesData.forEach(note => {
            minMidi = Math.min(minMidi, note.midiNote);
            maxMidi = Math.max(maxMidi, note.midiNote);
            maxTimeTicks = Math.max(maxTimeTicks, note.startTimeTicks + note.durationTicks);
        });

        minMidi = Math.max(0, minMidi - 2); // Add pitch padding
        maxMidi = Math.min(127, maxMidi + 2); // Add pitch padding
        const midiRange = maxMidi - minMidi + 1;

        // Add padding to the end time for visual spacing
        if (maxTimeTicks > 0) {
            maxTimeTicks += (maxTimeTicks * 0.02); // Add 2% padding to the time axis
        } else {
            maxTimeTicks = 1; // Avoid division by zero if there are notes but zero duration/time
        }

        // Calculate scaling factors based on CSS pixel dimensions
        const noteHeight = canvasHeight / midiRange;
        const timeScale = canvasWidth / maxTimeTicks; // pixels per tick

        // --- Draw Grid ---
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 0.5; // Draw thin lines (will be scaled by DPR)

        // Horizontal lines (pitch) - Draw lines for C notes
        for (let midi = minMidi; midi <= maxMidi; midi++) {
            if (midi % 12 === 0) { // If it's a C note
                const y = canvasHeight - ((midi - minMidi + 0.5) * noteHeight);
                this.ctx.beginPath();
                this.ctx.moveTo(0, y); // Use CSS pixel coords
                this.ctx.lineTo(canvasWidth, y); // Use CSS pixel coords
                this.ctx.stroke();
            }
        }
        // TODO: Add vertical grid lines (e.g., per beat or measure) if desired

        // --- Draw Notes ---
        this.ctx.fillStyle = noteColor;
        notesData.forEach(note => {
            const x = note.startTimeTicks * timeScale;
            const y = canvasHeight - ((note.midiNote - minMidi + 1) * noteHeight);
            const width = note.durationTicks * timeScale;
            const height = noteHeight;

            // Draw using CSS pixel coordinates (context is already scaled)
            // Add a minimum width/height for visibility
            this.ctx.fillRect(
                x,
                y,
                Math.max(1 / dpr, width - (1 / dpr)), // Small inset for visual separation
                Math.max(1 / dpr, height - (1 / dpr))
            );
        });
    }

    /** Draws a message centered on the canvas. */
    public drawEmptyMessage(message: string, color: string = '#6b7280'): void {
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        this.ctx.save();
        // Apply scaling for text rendering based on DPR if needed, but often default works
        // const dpr = window.devicePixelRatio || 1;
        // this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Ensure transform is set correctly if scaling text
        this.ctx.fillStyle = color;
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        // Use clientWidth/Height for positioning text in CSS pixels
        this.ctx.fillText(message, canvasWidth / 2, canvasHeight / 2);
        this.ctx.restore(); // Restore context state
    }

    /** Draws an error message centered on the canvas. */
     public drawErrorMessage(message: string): void {
        this.lastDrawnNotes = []; // Clear notes on error
        const backgroundColor = this.options.backgroundColor;

        // Clear canvas first
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for clearing
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        this.drawEmptyMessage(message, '#ef4444'); // red-500
    }

    public renderChordButtons(chords: string[], chordDetails: { symbol: string; startTimeTicks: number; durationTicks: number; initialVoicing: number[]; adjustedVoicing: number[]; rootNoteName: string; isValid: boolean; }[]): void {
        const buttonContainer = document.getElementById('chordButtonContainer');
        if (!buttonContainer) {
            console.error('Chord button container not found!');
            return;
        }
        buttonContainer.innerHTML = ''; // Clear existing buttons

        const activeNotesMap = new Map<number, ActiveNote[]>(); // Map to track active notes per button

        chords.forEach((chord, index) => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-primary m-1';
            button.textContent = chord;

            // When you click on the buttons, you should hear the sound of the corresponding chord.
            button.addEventListener('mousedown', () => {
                if (chordDetails && chordDetails[index]) {
                    const midiNotes = chordDetails[index].adjustedVoicing;
                    const activeNotes = this.synthPlayer.startChord(midiNotes); // Start the chord
                    activeNotesMap.set(index, activeNotes); // Track active notes for this button
                } else {
                    console.warn(`No details available for chord at index ${index}`);
                }
            });

            button.addEventListener('mouseup', () => {
                const activeNotes = activeNotesMap.get(index);
                if (activeNotes) {
                    this.synthPlayer.stopNotes(activeNotes); // Stop the chord
                    activeNotesMap.delete(index); // Remove from tracking
                }
            });

            button.addEventListener('mouseleave', () => {
                const activeNotes = activeNotesMap.get(index);
                if (activeNotes) {
                    this.synthPlayer.stopNotes(activeNotes); // Stop the chord if mouse leaves the button
                    activeNotesMap.delete(index); // Remove from tracking
                }
            });

            buttonContainer.appendChild(button);
        });
    }
}

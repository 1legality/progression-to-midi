// StepSequencer.ts
// Basic structure for a step sequencer module

export interface Step {
    active: boolean;
    note: string; // e.g., 'C4', 'D#3', etc.
    velocity: number;
}

export class StepSequencer {
    steps: Step[];
    stepCount: number;
    currentStep: number;

    constructor(stepCount: number = 16) {
        this.stepCount = stepCount;
        this.steps = Array.from({ length: stepCount }, () => ({ active: false, note: 'C4', velocity: 100 }));
        this.currentStep = 0;
    }

    toggleStep(index: number) {
        if (index >= 0 && index < this.stepCount) {
            this.steps[index].active = !this.steps[index].active;
        }
    }

    setStepNote(index: number, note: string) {
        if (index >= 0 && index < this.stepCount) {
            this.steps[index].note = note;
        }
    }

    setStepVelocity(index: number, velocity: number) {
        if (index >= 0 && index < this.stepCount) {
            this.steps[index].velocity = velocity;
        }
    }

    nextStep() {
        this.currentStep = (this.currentStep + 1) % this.stepCount;
        return this.currentStep;
    }

    reset() {
        this.currentStep = 0;
    }
}

// --- UI/DOM Integration for Step Sequencer Page ---
import { MidiGenerator } from './MidiGenerator';
import { PianoRollDrawer } from './PianoRollDrawer';

export function setupStepSequencerUI() {
    const form = document.getElementById('sequencerForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const stepsInput = document.getElementById('steps') as HTMLInputElement | null;
    const tempoInput = document.getElementById('tempo') as HTMLInputElement | null;
    const noteSequenceInput = document.getElementById('noteSequence') as HTMLTextAreaElement | null;
    const outputFileNameInput = document.getElementById('outputFileName') as HTMLInputElement | null;
    const downloadMidiButton = document.getElementById('downloadMidiButton') as HTMLButtonElement | null;
    const stepGridCanvas = document.getElementById('stepGridCanvas') as HTMLCanvasElement | null;

    if (!form || !statusDiv || !stepsInput || !tempoInput || !noteSequenceInput || !outputFileNameInput || !downloadMidiButton || !stepGridCanvas) {
        if (statusDiv) statusDiv.textContent = 'Error: Could not initialize the step sequencer (missing elements).';
        return;
    }

    let sequencer = new StepSequencer(Number(stepsInput!.value) || 16);
    const midiGenerator = new MidiGenerator();
    let pianoRollDrawer: PianoRollDrawer;
    try {
        pianoRollDrawer = new PianoRollDrawer(stepGridCanvas!);
    } catch (error: any) {
        if (statusDiv) {
            statusDiv.textContent = `Error: Canvas setup failed - ${error.message}`;
            statusDiv.className = 'mt-4 text-center text-danger';
        }
        stepGridCanvas!.style.border = '2px solid red';
        return;
    }
    let notesForPianoRoll: any[] = [];
    let events: { midiNote: number; startStep: number; length: number; velocity: number }[] = [];
    let maxStep = 0;

    function parseNoteSequenceInput(): void {
        sequencer = new StepSequencer(Number(stepsInput!.value) || 16);
        // Accept both single-line (space-separated) and multi-line (newline-separated) input
        const lines = noteSequenceInput!.value.split(/\s+/).map(l => l.trim()).filter(Boolean);
        events = [];
        maxStep = 0;
        for (const line of lines) {
            const parts = line.split(':');
            let note = 'C4';
            let pos = 0;
            let len = 1;
            let vel = 100;
            for (const part of parts) {
                if (/^[A-G][#b]?\d+$|^\d+$/.test(part)) note = part;
                else if (/^P(\d+)$/i.test(part)) pos = parseInt(part.slice(1), 10) - 1;
                else if (/^L(\d+)$/i.test(part)) len = parseInt(part.slice(1), 10);
                else if (/^V(\d+)$/i.test(part)) vel = parseInt(part.slice(1), 10);
            }
            for (let i = 0; i < len; ++i) {
                const idx = pos + i;
                if (idx >= 0 && idx < sequencer.stepCount) {
                    sequencer.steps[idx].active = true;
                    sequencer.steps[idx].note = note;
                    sequencer.steps[idx].velocity = vel;
                }
            }
            // For piano roll preview:
            const noteNameMatch = note.match(/^([A-G][#b]?)(\d+)$/i);
            if (!noteNameMatch) continue;
            const noteName = noteNameMatch[1];
            const octave = parseInt(noteNameMatch[2], 10);
            const midiNote = midiGenerator['getMidiNote'](noteName, octave);
            events.push({ midiNote, startStep: pos, length: len, velocity: vel });
            if (pos + len > maxStep) maxStep = pos + len;
        }
        // Group events by step for simultaneity
        const stepMap: Record<number, typeof events> = {};
        for (const ev of events) {
            for (let i = 0; i < ev.length; ++i) {
                const step = ev.startStep + i;
                if (!stepMap[step]) stepMap[step] = [];
                stepMap[step].push({ ...ev, startStep: step, length: 1 });
            }
        }
        // Build notesForPianoRoll for the drawer
        const TPQN = 128;
        const stepTicks = TPQN / 4;
        notesForPianoRoll = [];
        for (let step = 0; step < maxStep; ++step) {
            const eventsAtStep = stepMap[step] || [];
            if (eventsAtStep.length > 0) {
                eventsAtStep.forEach((ev) => {
                    notesForPianoRoll.push({
                        midiNote: ev.midiNote,
                        startTimeTicks: step * stepTicks,
                        durationTicks: stepTicks,
                        velocity: ev.velocity
                    });
                });
            }
        }
    }

    function drawStepGrid() {
        pianoRollDrawer.draw(notesForPianoRoll);
    }

    function stepsToProgressionString(): string {
        // Build progression string from parsed events, not from Step array
        // Only output real notes, skip dummy rest notes for empty steps
        const stepMap: Record<number, typeof events> = {};
        for (const ev of events) {
            if (!stepMap[ev.startStep]) stepMap[ev.startStep] = [];
            stepMap[ev.startStep].push(ev);
        }
        const totalSteps = Number(stepsInput!.value) || 16;
        let progression: string[] = [];
        for (let i = 0; i < totalSteps; ++i) {
            const evs = stepMap[i] || [];
            if (evs.length > 0) {
                // Output all notes at this step as separate entries (for simultaneity)
                evs.forEach(ev => {
                    progression.push(`${getNoteNameFromMidi(ev.midiNote)}:P${i+1}:L${ev.length}:V${ev.velocity}`);
                });
            }
            // No dummy note for empty steps!
        }
        return progression.join(' ');
    }

    function getNoteNameFromMidi(midiNote: number): string {
        // Convert MIDI note number back to note name and octave (e.g., 36 -> C2)
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const note = noteNames[midiNote % 12];
        const octave = Math.floor(midiNote / 12) - 1;
        return `${note}${octave}`;
    }

    function handleDownload() {
        try {
            const progressionString = stepsToProgressionString();
            if (!progressionString) {
                statusDiv!.textContent = 'No active steps to export.';
                statusDiv!.className = 'mt-4 text-center text-danger';
                return;
            }
            const options = {
                progressionString,
                outputFileName: outputFileNameInput!.value || 'sequence.mid',
                outputType: 'notesOnly' as const,
                inversionType: 'none' as const,
                baseOctave: 4,
                chordDurationStr: undefined,
                tempo: Number(tempoInput!.value) || 120,
                velocity: 100,
                totalSteps: Number(stepsInput!.value) || 16 // Pass total steps from UI
            };
            const result = midiGenerator.generate(options);
            const blob = result.midiBlob;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.finalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            statusDiv!.textContent = `MIDI file "${result.finalFileName}" download initiated.`;
            statusDiv!.className = 'mt-4 text-center text-success';
        } catch (err: any) {
            statusDiv!.textContent = 'Error: ' + (err.message || 'Failed to generate MIDI.');
            statusDiv!.className = 'mt-4 text-center text-danger';
        }
    }

    // --- Event Listeners ---
    stepsInput!.addEventListener('change', () => {
        sequencer = new StepSequencer(Number(stepsInput!.value) || 16);
        parseNoteSequenceInput();
        drawStepGrid();
    });
    noteSequenceInput!.addEventListener('input', () => {
        parseNoteSequenceInput();
        drawStepGrid();
    });
    downloadMidiButton!.addEventListener('click', (e) => {
        e.preventDefault();
        parseNoteSequenceInput();
        drawStepGrid();
        handleDownload();
    });

    // --- Initial State ---
    parseNoteSequenceInput();
    drawStepGrid();
    statusDiv!.textContent = 'Enter notes and click Download.';
}

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

    function parseNoteSequenceInput(): void {
        // Reset all steps
        sequencer = new StepSequencer(Number(stepsInput!.value) || 16);
        const lines = noteSequenceInput!.value.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            // Format: NoteOrMidi:P#:L#:V#
            // Example: E3:P1:L2:V110
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
        }
    }

    function drawStepGrid() {
        const ctx = stepGridCanvas!.getContext('2d');
        if (!ctx) return;
        const w = stepGridCanvas!.width = stepGridCanvas!.offsetWidth;
        const h = stepGridCanvas!.height = 60;
        const stepW = w / sequencer.stepCount;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < sequencer.stepCount; ++i) {
            ctx.fillStyle = sequencer.steps[i].active ? '#0d6efd' : '#e9ecef';
            ctx.fillRect(i * stepW, 0, stepW - 2, h);
            ctx.strokeStyle = '#adb5bd';
            ctx.strokeRect(i * stepW, 0, stepW - 2, h);
            if (sequencer.steps[i].active) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(sequencer.steps[i].note, i * stepW + stepW / 2, h / 2);
            }
        }
    }

    function stepsToProgressionString(): string {
        // Convert sequencer steps to a space-separated string for MidiGenerator
        // Each step: note:duration (duration in bars, e.g. 0.25 for a 16-step grid in 4/4)
        const stepsPerBar = 4; // Default: 16 steps = 4 bars, so 4 steps per bar
        const stepDuration = 1 / stepsPerBar; // 0.25 bars per step
        let progression: string[] = [];
        for (let i = 0; i < sequencer.stepCount; ++i) {
            const step = sequencer.steps[i];
            if (step.active) {
                // Use note:duration (e.g. C4:0.25)
                progression.push(`${step.note}:${stepDuration}`);
            }
        }
        return progression.join(' ');
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
                outputType: 'chordsOnly' as const,
                inversionType: 'none' as const,
                baseOctave: 4,
                chordDurationStr: undefined,
                tempo: Number(tempoInput!.value) || 120,
                velocity: 100
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

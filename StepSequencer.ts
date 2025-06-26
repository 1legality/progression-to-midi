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
import { getNoteNameFromMidi } from './Utils';

export function setupStepSequencerUI() {
    const form = document.getElementById('sequencerForm') as HTMLFormElement | null;
    const statusDiv = document.getElementById('status');
    const noteSequenceInput = document.getElementById('noteSequence') as HTMLTextAreaElement | null;
    const outputFileNameInput = document.getElementById('outputFileName') as HTMLInputElement | null;
    const downloadMidiButton = document.getElementById('downloadMidiButton') as HTMLButtonElement | null;
    const stepGridCanvas = document.getElementById('stepGridCanvas') as HTMLCanvasElement | null;

    if (!form || !statusDiv || !noteSequenceInput || !outputFileNameInput || !downloadMidiButton || !stepGridCanvas) {
        if (statusDiv) statusDiv.textContent = 'Error: Could not initialize the step sequencer (missing elements).';
        return;
    }

    let sequencer: StepSequencer;
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
    let totalSteps = 16;
    let tempo = 120;

    function parseNoteSequenceInput(): void {
        // Parse for | S[steps]:B[bpm] at the end
        let input = noteSequenceInput!.value.trim();
        let stepsMatch = input.match(/\|\s*S(\d+)(?::?B(\d+))?$/i);
        if (stepsMatch) {
            totalSteps = parseInt(stepsMatch[1], 10);
            if (stepsMatch[2]) tempo = parseInt(stepsMatch[2], 10);
            input = input.replace(/\|\s*S\d+(?::?B\d+)?$/i, '').trim();
        } else {
            // Default values if not provided
            totalSteps = 16;
            tempo = 120;
        }
        sequencer = new StepSequencer(totalSteps);
        // Accept both single-line (space-separated) and multi-line (newline-separated) input
        const lines = input.split(/\s+/).map(l => l.trim()).filter(Boolean);
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
            // Only add one event per note (at its start position, with its full length)
            let midiNote: number | null = null;
            const noteNameMatch = note.match(/^([A-G][#b]?)(\d+)$/i);
            if (noteNameMatch) {
                const noteName = noteNameMatch[1];
                const octave = parseInt(noteNameMatch[2], 10);
                midiNote = midiGenerator['getMidiNote'](noteName, octave);
            } else if (/^\d+$/.test(note)) {
                midiNote = parseInt(note, 10);
            }
            if (midiNote === null) continue;
            events.push({ midiNote, startStep: pos, length: len, velocity: vel });
            if (pos + len > maxStep) maxStep = pos + len;
        }
        // Build notesForPianoRoll for the drawer (preserve note lengths)
        const TPQN = 128;
        // Calculate stepTicks so that totalSteps always fills 4 bars
        const stepTicks = (TPQN * 4) / totalSteps;
        notesForPianoRoll = [];
        for (const ev of events) {
            notesForPianoRoll.push({
                midiNote: ev.midiNote,
                startTimeTicks: ev.startStep * stepTicks,
                durationTicks: ev.length * stepTicks,
                velocity: ev.velocity
            });
        }
    }

    function drawStepGrid() {
        pianoRollDrawer.draw(notesForPianoRoll);
    }

    function stepsToProgressionString(): string {
        // Build progression string from parsed events, not from Step array
        // Only output real notes, skip dummy rest notes for empty steps
        let progression: string[] = [];
        for (const ev of events) {
            progression.push(`${getNoteNameFromMidi(ev.midiNote)}:P${ev.startStep+1}:L${ev.length}:V${ev.velocity}`);
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
                outputType: 'notesOnly' as const,
                inversionType: 'none' as const,
                baseOctave: 4,
                chordDurationStr: undefined,
                tempo: tempo,
                velocity: 100,
                totalSteps: totalSteps // Pass total steps from parsed input
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

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

    let sequencer: StepSequencer; // Manages the UI grid steps
    const midiGenerator = new MidiGenerator();
    let pianoRollDrawer: PianoRollDrawer;
    try {
        pianoRollDrawer = new PianoRollDrawer(stepGridCanvas!);
    } catch (error: any) {
        if (statusDiv) {
            statusDiv.textContent = `Error: Piano Roll Canvas setup failed - ${error.message}`;
            statusDiv.className = 'mt-4 text-center text-danger';
        }
        stepGridCanvas!.style.border = '2px solid red';
        return;
    }
    let notesForPianoRoll: any[] = [];
    let events: { midiNote: number; startStep: number; length: number; velocity: number }[] = []; // Parsed note events
    let maxStep = 0; // The highest step number occupied by any note

    // Internal variables to store parsed configuration for MIDI generation
    let _totalSequenceSteps = 16; // Total steps in the entire sequence (for MIDI file length)
    let _stepsPerBar = 16; // How many steps constitute one bar (for rhythmic resolution)
    let _tempo = 120; // Tempo in BPM

    function parseNoteSequenceInput(): void {
        let input = noteSequenceInput!.value.trim();
        let parsedTotalSequenceSteps = 16; // Default
        let parsedStepsPerBar = 16; // Default
        let parsedTempo = 120; // Default

        let configPart = '';
        const configMatch = input.match(/\|\s*(.+)$/);
        if (configMatch) {
            configPart = configMatch[1];
            input = input.replace(/\|\s*.+$/, '').trim(); // Remove config part from main input
        }

        // Parse config part for S, B, SPB (order-independent)
        const configItems = configPart.split(':').map(item => item.trim());
        for (const item of configItems) {
            if (item.startsWith('S')) {
                parsedTotalSequenceSteps = parseInt(item.substring(1), 10);
            } else if (item.startsWith('B')) {
                parsedTempo = parseInt(item.substring(1), 10);
            } else if (item.startsWith('SPB')) {
                parsedStepsPerBar = parseInt(item.substring(3), 10);
            }
        }

        // Ensure parsed values are valid numbers and sensible defaults
        if (isNaN(parsedStepsPerBar) || parsedStepsPerBar < 1) parsedStepsPerBar = 16;
        if (isNaN(parsedTotalSequenceSteps) || parsedTotalSequenceSteps < 1) parsedTotalSequenceSteps = 16;
        if (isNaN(parsedTempo) || parsedTempo < 1) parsedTempo = 120;

        // Parse notes to determine actual maxStep
        events = [];
        maxStep = 0; // Reset maxStep for current parsing
        // Accept both single-line (space-separated) and multi-line (newline-separated) input
        const lines = input.split(/\s+/).map(l => l.trim()).filter(Boolean);
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
            let midiNote: number | null = null;
            const noteNameMatch = note.match(/^([A-G][#b]?)(\d+)$/i);
            if (noteNameMatch) {
                const noteName = noteNameMatch[1];
                const octave = parseInt(noteNameMatch[2], 10);
                midiNote = midiGenerator'getMidiNote';
            } else if (/^\d+$/.test(note)) {
                midiNote = parseInt(note, 10);
            }
            if (midiNote === null) continue;
            events.push({ midiNote, startStep: pos, length: len, velocity: vel });
            if (pos + len > maxStep) maxStep = pos + len;
        }

        // Adjust parsedTotalSequenceSteps if it's less than the actual maxStep from notes
        if (parsedTotalSequenceSteps < maxStep) {
            parsedTotalSequenceSteps = maxStep;
        }
        // Also ensure totalSequenceSteps is at least stepsPerBar if it's a very short sequence
        if (parsedTotalSequenceSteps < parsedStepsPerBar) {
            parsedTotalSequenceSteps = parsedStepsPerBar;
        }

        // Update the internal variables used for MIDI generation
        _totalSequenceSteps = parsedTotalSequenceSteps;
        _stepsPerBar = parsedStepsPerBar;
        _tempo = parsedTempo;

        // Initialize sequencer with the determined total sequence steps (for UI grid size)
        sequencer = new StepSequencer(_totalSequenceSteps);

        // Build notesForPianoRoll for the drawer (preserve note lengths)
        const TPQN = 128;
        // Calculate stepTicks for piano roll based on stepsPerBar (rhythmic resolution)
        const pianoRollStepTicks = (TPQN * 4) / _stepsPerBar; // Each bar has _stepsPerBar steps
        notesForPianoRoll = [];
        for (const ev of events) {
            notesForPianoRoll.push({
                midiNote: ev.midiNote,
                startTimeTicks: ev.startStep * pianoRollStepTicks,
                durationTicks: ev.length * pianoRollStepTicks,
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
                chordDurationStr: undefined, // Not used for notesOnly
                tempo: _tempo,
                velocity: 100,
                totalSequenceSteps: _totalSequenceSteps, // Pass total steps for the entire sequence
                stepsPerBar: _stepsPerBar // Pass steps per bar for timing calculation
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

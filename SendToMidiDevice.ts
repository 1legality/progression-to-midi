// Function to send chord details to a MIDI device
export async function sendChordToMidiDevice(chordNotes: number[], velocity: number): Promise<void> {
    try {
        // Request MIDI access
        const midiAccess = await navigator.requestMIDIAccess();

        // Get the first available output device
        const outputs = Array.from(midiAccess.outputs.values());
        if (outputs.length === 0) {
            console.error('No MIDI output devices available.');
            return;
        }
        const output = outputs[0];

        // Send Note On messages for each note in the chord
        chordNotes.forEach(note => {
            output.send([0x90, note, velocity]); // 0x90 = Note On, velocity = loudness
        });

        // Send Note Off messages after a short delay (e.g., 500ms)
        setTimeout(() => {
            chordNotes.forEach(note => {
                output.send([0x80, note, 0]); // 0x80 = Note Off
            });
        }, 500);

    } catch (error) {
        console.error('Failed to send MIDI message:', error);
    }
}

// Function to fetch available MIDI output devices
export async function getMidiOutputDevices(): Promise<{ id: string; name: string }[]> {
    try {
        const midiAccess = await navigator.requestMIDIAccess();
        const outputs = Array.from(midiAccess.outputs.values());
        return outputs.map(output => ({ id: output.id, name: output.name || 'Unknown Device' }));
    } catch (error) {
        console.error('Failed to fetch MIDI output devices:', error);
        return [];
    }
}
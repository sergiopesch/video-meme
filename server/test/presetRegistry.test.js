const test = require('node:test');
const assert = require('node:assert/strict');
const { listPresets, getDefaultPreset, getPresetById } = require('../src/presets/presetRegistry');

test('preset registry returns structured metadata for the editor', () => {
  const presets = listPresets();

  assert.equal(presets.length, 1);
  assert.equal(getDefaultPreset().id, presets[0].id);
  assert.equal(getDefaultPreset().id, 'caption-punch');

  for (const preset of presets) {
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(Array.isArray(preset.inputTypes));
    assert.ok(Array.isArray(preset.textSlots));
    assert.ok(preset.output.width > 0);
    assert.ok(preset.output.height > 0);
    assert.ok(preset.output.width <= 480);
    assert.ok(preset.output.height <= 640);
    assert.ok(preset.output.fps <= 12);
    assert.ok(preset.output.defaultDuration > 0);
    assert.ok(preset.output.maxDuration >= preset.output.defaultDuration);
    assert.ok(preset.trim.maxDurationSeconds >= preset.trim.defaultDurationSeconds);
    assert.equal(preset.export?.format, 'gif');
    assert.equal(preset.export?.mimeType, 'image/gif');
    assert.equal(preset.export?.hasAudio, false);

    for (const slot of preset.textSlots) {
      assert.equal(slot.id, 'caption');
      assert.ok(slot.maxLength > 0);
    }
  }

  assert.equal(getPresetById('caption-punch')?.name, 'Caption Punch');
});

test('preset selectors return defensive copies of nested metadata', () => {
  const presets = listPresets();
  presets[0].inputTypes.push('audio');
  presets[0].textSlots[0].label = 'Changed';

  assert.ok(!listPresets()[0].inputTypes.includes('audio'));
  assert.notEqual(getDefaultPreset().textSlots[0].label, 'Changed');
});

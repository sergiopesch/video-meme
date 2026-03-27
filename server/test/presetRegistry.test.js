const test = require('node:test');
const assert = require('node:assert/strict');
const { listPresets, getDefaultPreset, getPresetById } = require('../src/presets/presetRegistry');

test('preset registry returns structured metadata for the editor', () => {
  const presets = listPresets();

  assert.ok(presets.length >= 3);
  assert.equal(getDefaultPreset().id, presets[0].id);

  for (const preset of presets) {
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(Array.isArray(preset.inputTypes));
    assert.ok(Array.isArray(preset.textSlots));
    assert.ok(preset.output.width > 0);
    assert.ok(preset.output.height > 0);
    assert.ok(preset.trim.maxDurationSeconds >= preset.trim.defaultDurationSeconds);
  }

  assert.equal(getPresetById('story-stack')?.name, 'Story Stack');
});

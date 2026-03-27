const test = require('node:test');
const assert = require('node:assert/strict');
const { listPresets, getDefaultPreset, getPresetById } = require('../src/presets/presetRegistry');

test('preset registry returns structured metadata for the editor', () => {
  const presets = listPresets();

  assert.ok(presets.length >= 6);
  assert.equal(getDefaultPreset().id, presets[0].id);

  for (const preset of presets) {
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(preset.thumbnail?.src);
    assert.ok(preset.thumbnail?.alt);
    assert.ok(Array.isArray(preset.inputTypes));
    assert.ok(Array.isArray(preset.tags));
    assert.ok(Array.isArray(preset.textSlots));
    assert.ok(preset.output.width > 0);
    assert.ok(preset.output.height > 0);
    assert.ok(preset.output.defaultDuration > 0);
    assert.ok(preset.output.maxDuration >= preset.output.defaultDuration);
    assert.ok(preset.trim.maxDurationSeconds >= preset.trim.defaultDurationSeconds);

    for (const slot of preset.textSlots) {
      assert.match(slot.id, /^(topText|bottomText|caption)$/);
      assert.ok(slot.maxLength > 0);
    }
  }

  assert.equal(getPresetById('story-stack')?.name, 'Story Stack');
  assert.equal(getPresetById('lower-third-burn')?.thumbnail.src, '/preset-thumbnails/lower-third-burn.svg');
});

test('preset selectors return defensive copies of nested metadata', () => {
  const presets = listPresets();
  presets[0].tags.push('mutated');
  presets[0].textSlots[0].label = 'Changed';

  assert.ok(!listPresets()[0].tags.includes('mutated'));
  assert.notEqual(getDefaultPreset().textSlots[0].label, 'Changed');
});

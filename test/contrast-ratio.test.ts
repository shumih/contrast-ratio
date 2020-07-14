import { ColorContrast } from '../src/contrast-ratio';

/**
 * ColorContrast test
 */
describe('ColorContrast test', () => {
  it('ColorContrast is instantiable', () => {
    expect(new ColorContrast([255, 255, 255, 1])).toBeInstanceOf(ColorContrast);
  });

  it('ColorContrast should support "transparent" values', () => {
    expect(new ColorContrast('transparent')).toBeInstanceOf(ColorContrast);
  });

  it('ColorContrast should support hex value', () => {
    expect(new ColorContrast('#cc11cc')).toBeInstanceOf(ColorContrast);
  });

  it('ColorContrast should support rgb value', () => {
    expect(new ColorContrast('rgb(255, 255, 255)')).toBeInstanceOf(ColorContrast);
  });

  it('should fail on ColorContrast instantiation', () => {
    expect(() => new ColorContrast('red')).toThrow(/Invalid string/);
  });
});

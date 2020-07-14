type RGBColor = [number, number, number];
type RGBAColor = [number, number, number, number];
type Color = RGBAColor | RGBColor | string | 'transparent';

function isHexColor(color: string) {
  return color.startsWith('#');
}

function isRGBAColor(type: Color): type is RGBAColor {
  return Array.isArray(type) && type.length === 4;
}

function isRGBColor(type: Color): type is RGBColor {
  return Array.isArray(type) && type.length === 3;
}

function hexToRGBA(hex: string) {
  const matches = hex
    .substr(1)
    .match(/.{1,2}/g)
    ?.map(c => parseInt(c, 16))
    .slice(0, 4);

  if (matches == null) {
    return null;
  }

  if (matches[3] == null) {
    matches[3] = 1;
  }

  return matches as RGBAColor;
}

export class ColorContrast {
  public static BLACK = new ColorContrast([0, 0, 0]);
  public static GRAY = new ColorContrast([127.5, 127.5, 127.5]);
  public static WHITE = new ColorContrast([255, 255, 255]);

  public rgba: RGBAColor;

  get rgb() {
    return this.rgba.slice(0, 3);
  }

  get alpha() {
    return this.rgba[3];
  }

  set alpha(alpha) {
    this.rgba[3] = alpha;
  }

  get luminance() {
    // Formula: http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
    const rgba = this.rgba.slice();

    for (let i = 0; i < 3; i++) {
      let rgb = rgba[i];

      rgb /= 255;

      rgb = rgb < 0.03928 ? rgb / 12.92 : Math.pow((rgb + 0.055) / 1.055, 2.4);

      rgba[i] = rgb;
    }

    return 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
  }

  get inverse() {
    return new ColorContrast([255 - this.rgba[0], 255 - this.rgba[1], 255 - this.rgba[2], this.alpha]);
  }

  constructor(rgba: Color) {
    if (rgba === 'transparent') {
      this.rgba = [0, 0, 0, 0];
      return;
    }

    if (isRGBAColor(rgba)) {
      this.rgba = rgba;
      return;
    }

    if (isRGBColor(rgba)) {
      this.rgba = rgba.concat([1]) as RGBAColor;
      return;
    }

    if (isHexColor(rgba)) {
      const parsed = hexToRGBA(rgba);

      if (parsed == null) {
        throw new Error('Invalid string: ' + rgba);
      }

      this.rgba = parsed;

      return;
    }

    const matches: Array<string | number> | null = rgba.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);

    if (Array.isArray(matches)) {
      matches.shift();
    } else {
      throw new Error('Invalid string: ' + rgba);
    }

    // tslint:disable-next-line:strict-type-predicates
    if (matches[3] == null) {
      matches[3] = 1;
    }

    this.rgba = matches.map(a => +a) as RGBAColor;
  }

  toString() {
    return 'rgb' + (this.alpha < 1 ? 'a' : '') + '(' + this.rgba.slice(0, this.alpha >= 1 ? 3 : 4).join(', ') + ')';
  }

  clone() {
    return new ColorContrast(this.rgba);
  }

  // Overlay a color over another
  overlayOn(color: ColorContrast) {
    const overlaid = this.clone();

    const alpha = this.alpha;

    if (alpha >= 1) {
      return overlaid;
    }

    for (let i = 0; i < 3; i++) {
      overlaid.rgba[i] = overlaid.rgba[i] * alpha + color.rgba[i] * color.rgba[3] * (1 - alpha);
    }

    overlaid.rgba[3] = alpha + color.rgba[3] * (1 - alpha);

    return overlaid;
  }

  contrast(color: ColorContrast) {
    // Formula: http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
    const alpha = this.alpha;

    if (alpha >= 1) {
      if (color.alpha < 1) {
        color = color.overlayOn(this);
      }

      let l1 = this.luminance + 0.05;
      let l2 = color.luminance + 0.05;
      let ratio = l1 / l2;

      if (l2 > l1) {
        ratio = 1 / ratio;
      }

      // ratio = floor(ratio, 2);

      return {
        ratio: ratio,
        error: 0,
        min: ratio,
        max: ratio,
      };
    }

    // If we’re here, it means we have a semi-transparent background
    // The text color may or may not be semi-transparent, but that doesn't matter

    const onBlack = this.overlayOn(ColorContrast.BLACK);
    const onWhite = this.overlayOn(ColorContrast.WHITE);
    const contrastOnBlack = onBlack.contrast(color).ratio;
    const contrastOnWhite = onWhite.contrast(color).ratio;

    const max = Math.max(contrastOnBlack, contrastOnWhite);

    // This is here for backwards compatibility and not used to calculate
    // `min`.  Note that there may be other colors with a closer luminance to
    // `color` if they have a different hue than `this`.
    let closest = this.rgb.map(function(c, i) {
      return Math.min(Math.max(0, (color.rgb[i] - c * alpha) / (1 - alpha)), 255);
    }) as RGBAColor;

    const closestContrast = new ColorContrast(closest);

    let min = 1;
    if (onBlack.luminance > color.luminance) {
      min = contrastOnBlack;
    } else if (onWhite.luminance < color.luminance) {
      min = contrastOnWhite;
    }

    return {
      ratio: (min + max) / 2,
      error: (max - min) / 2,
      min: min,
      max: max,
      closest: closestContrast,
      farthest:
        // tslint:disable-next-line:triple-equals
        (onWhite as unknown) == max ? ColorContrast.WHITE : ColorContrast.BLACK,
    };
  }
}

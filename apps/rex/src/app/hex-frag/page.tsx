'use client';

import { useMemo, useState } from 'react';

import { Button } from '~/app/_components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/app/_components/shadcn/card';
import { Input } from '~/app/_components/shadcn/input';
import { Label } from '~/app/_components/shadcn/label';

type RGB = { r: number; g: number; b: number };

function parseHexColor(input: string): RGB | null {
  const trimmed = input.trim();

  // Strip leading "#", allow both "#abc" and "#aabbcc"
  const hex = trimmed.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
    return null;
  }

  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(ch => ch + ch)
          .join('')
      : hex;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some(v => Number.isNaN(v))) {
    return null;
  }

  return { r, g, b };
}

// Standard GLSL-style: vec3(67., 73., 85.) / 255.
function makeFragExpression(rgb: RGB): string {
  const { r, g, b } = rgb;
  return `vec3(${r.toFixed(0)}., ${g.toFixed(0)}., ${b.toFixed(0)}.)/255.;`;
}

export default function HexToFragPage() {
  const [hex, setHex] = useState('#434955');
  const [copied, setCopied] = useState(false);

  const { rgb, expression, error } = useMemo(() => {
    if (!hex.trim()) {
      return { rgb: null as RGB | null, expression: '', error: '' };
    }

    const parsed = parseHexColor(hex);
    if (!parsed) {
      return {
        rgb: null as RGB | null,
        expression: '',
        error: 'Enter a 3- or 6-digit hex color, e.g. #434955',
      };
    }

    return {
      rgb: parsed,
      expression: makeFragExpression(parsed),
      error: '',
    };
  }, [hex]);

  const handleCopy = async () => {
    if (!expression || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore copy errors
    }
  };

  const previewHex = (() => {
    const trimmed = hex.trim();
    const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    return valid ? trimmed : '#ffffff';
  })();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Hex → frag vec3</CardTitle>
          <CardDescription>
            Convert a hex color (e.g. <code>#434955</code>) into a GLSL fragment
            shader expression.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="hex">Hex color</Label>
            <div className="flex items-center gap-3">
              {/** biome-ignore lint/correctness/useUniqueElementIds: ¯\_(ツ)_/¯ */}
              <Input
                id="hex"
                value={hex}
                onChange={e => setHex(e.target.value)}
                placeholder="#434955"
                className="font-mono"
              />
              {/** biome-ignore lint/a11y/useAriaPropsSupportedByRole: ¯\_(ツ)_/¯ */}
              <div
                aria-label="Color preview"
                className="h-9 w-9 rounded border"
                style={{ backgroundColor: previewHex }}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Output */}
          <div className="space-y-2">
            <Label htmlFor="frag">Fragment expression</Label>
            <div className="flex items-center gap-2">
              {/** biome-ignore lint/correctness/useUniqueElementIds: ¯\_(ツ)_/¯ */}
              <Input
                id="frag"
                readOnly
                value={expression}
                placeholder="vec3(67., 73., 85.)/255.;"
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!expression}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            {rgb && (
              <p className="text-xs text-muted-foreground">
                RGB: {rgb.r}, {rgb.g}, {rgb.b}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

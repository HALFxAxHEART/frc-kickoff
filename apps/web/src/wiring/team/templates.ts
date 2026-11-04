// 5090 starting diagrams for New → "5090 …". They follow the 5090 Electrical Reference (2027):
// SystemCore buses can_s0 swerve + gyro, can_s1 intake, can_s2 indexer, can_s3 upper chassis,
// can_s4 PDH; CAN IDs from the 2026 robot code; IPs 10.50.90.x; the power-hat rule (sensors are fed
// from a fused Powerpole tap on their mechanism's motor; the Pigeon 2 has its own fused slot);
// SystemCore → radio direct, radio AUX → SW-005 switch → Limelights; Thriftiest Cams on SystemCore USB.
// PDH channel numbers are not in the code: the ones here are placeholders, marked on each wire.
import type { Catalog } from '../catalog/catalog';
import type { Device, Doc, Rot, TagSide, Wire } from '../model/types';
import { validateDoc } from '../model/validate';
import type { Layer } from '../catalog/catalog';

export type TemplateId = 'base' | 'robot2026';

export const TEMPLATES: { id: TemplateId; label: string; title: string }[] = [
  { id: 'base', label: '5090 standard base', title: '5090 standard base (power, control, network, swerve)' },
  { id: 'robot2026', label: '5090 2026 robot', title: '5090 2026 robot (Hephaestus)' },
];

const CH_NOTE = 'PDH channel is a placeholder: set it to the real channel.';

class Builder {
  devices: Device[] = [];
  wires: Wire[] = [];
  private n = 0;
  private w = 0;

  dev(
    slug: string, x: number, y: number, name: string,
    o: { can?: number; bus?: string; ip?: string; rot?: Rot; tag?: TagSide; notes?: string } = {},
  ): string {
    const id = `d${++this.n}`;
    this.devices.push({
      id, slug, x, y, rot: o.rot ?? 0, name, canId: o.can ?? null, notes: o.notes ?? '',
      ...(o.tag ? { tagSide: o.tag } : {}), ...(o.ip ? { ip: o.ip } : {}), ...(o.bus ? { canBus: o.bus } : {}),
    });
    return id;
  }

  wire(layer: Layer, from: [string, string], to: [string, string], o: { note?: string; fuseA?: number; awg?: number } = {}): void {
    this.wires.push({
      id: `w${++this.w}`, layer, from: { device: from[0], port: from[1] }, to: { device: to[0], port: to[1] },
      bends: [], note: o.note ?? '', ...(o.fuseA ? { fuseA: o.fuseA } : {}), ...(o.awg ? { awg: o.awg } : {}),
    });
  }

  /** A CAN chain from a SystemCore bus through each [device, inPort, outPort], ending at a terminator. */
  canChain(start: [string, string], chain: [string, string, string][], term?: string): void {
    let prev = start;
    for (const [d, inPort, outPort] of chain) {
      this.wire('can', prev, [d, inPort]);
      prev = [d, outPort];
    }
    if (term) this.wire('can', prev, [term, 'can']);
  }
}

/** Kraken X60 (and X44, Talon FXS) chain through their single "can" port pair. */
const krakenCan = (d: string): [string, string, string] => [d, 'can', 'can'];
const ctreSensorCan = (d: string): [string, string, string] => [d, 'can_a', 'can_b'];

function base(b: Builder): { sc: string; pdh: string; nextCh: () => number } {
  // power
  const bat = b.dev('frc-battery', -470, 260, 'Battery', { tag: 'left' });
  const brk = b.dev('main-breaker-120a', -200, 300, 'Main breaker 120 A', { tag: 'right' });
  const pdh = b.dev('rev-pdh', 0, 0, 'PDH', { can: 1, bus: 'can_s4', tag: 'top' });
  b.wire('power', [bat, 'sb50_pos'], [brk, 'bat'], { awg: 6 });
  b.wire('power', [brk, 'aux'], [pdh, 'batt_pos'], { awg: 6 });
  b.wire('power', [bat, 'sb50_neg'], [pdh, 'batt_neg'], { awg: 6 });

  // control + network
  const sc = b.dev('systemcore', 230, -300, 'SystemCore', { ip: '10.50.90.2', tag: 'left' });
  const radio = b.dev('vh-109', 560, -470, 'VH-109 radio', { ip: '10.50.90.1', tag: 'top', notes: 'Enable SystemCore Mode in the radio settings.' });
  const sw = b.dev('brainboxes-sw-005', 760, -480, 'SW-005 switch', { tag: 'top', notes: 'Unmanaged. Leave FE empty.' });
  const ll1 = b.dev('limelight-4', 920, -360, 'Limelight front', { ip: '10.50.90.11', tag: 'right' });
  const ll2 = b.dev('limelight-4', 920, -260, 'Limelight back', { ip: '10.50.90.12', tag: 'right' });
  b.wire('power', [pdh, 'ch20'], [sc, 'pwr_bridge'], { note: `SystemCore via its Bridge (Micro-Fit+), never a VRM. ${CH_NOTE}`, fuseA: 10 });
  b.wire('power', [pdh, 'ch21'], [radio, 'pwr_in'], { note: CH_NOTE, fuseA: 10 });
  b.wire('power', [pdh, 'ch22'], [sw, 'pwr_pos'], { note: CH_NOTE, fuseA: 5 });
  b.wire('power', [pdh, 'ch19'], [ll1, 'pwr_pos'], { note: CH_NOTE, fuseA: 20, awg: 18 });
  b.wire('power', [pdh, 'ch18'], [ll2, 'pwr_pos'], { note: CH_NOTE, fuseA: 20, awg: 18 });
  b.wire('network', [sc, 'eth0'], [radio, 'eth_rio'], { note: 'SystemCore → radio RIO port direct: a dead switch only loses vision.' });
  b.wire('network', [radio, 'eth_aux1'], [sw, 'eth1']);
  b.wire('network', [sw, 'eth2'], [ll1, 'ethernet']);
  b.wire('network', [sw, 'eth3'], [ll2, 'ethernet']);

  // USB cameras: one per SystemCore USB port, no hub
  ['usb0', 'usb1', 'usb2', 'usb3'].forEach((port, i) => {
    const cam = b.dev('thriftiest-cam', 230 + i * 60, -150, `Cam ${i + 1}`, { tag: 'bottom' });
    b.wire('network', [sc, port], [cam, 'usb_c']);
  });

  // PDH on can_s4 with the CANdle, ends at a terminator
  const candle = b.dev('candle', 240, 260, 'CANdle LEDs', { can: 2, bus: 'can_s4', tag: 'bottom' });
  const t4 = b.dev('can-terminator', 400, 300, 'Term s4', { tag: 'bottom' });
  b.wire('power', [pdh, 'ch23'], [candle, 'pwr'], { note: CH_NOTE, fuseA: 5 });
  b.canChain([sc, 'can_s4'], [ctreSensorCan(pdh), ctreSensorCan(candle)], t4);

  // can_s0: swerve (drive 40-43, turn 30-33, CANcoder 50-53) + Pigeon 0
  const mods: [string, number, number][] = [['FL', 520, -60], ['FR', 900, -60], ['BL', 520, 260], ['BR', 900, 260]];
  const s0: [string, string, string][] = [];
  let ch = 0;
  mods.forEach(([m, x, y], i) => {
    const hat = b.dev('power-hat', x - 20, y - 70, `${m} hat`, { tag: 'top' });
    const drive = b.dev('kraken-x60', x - 40, y, `${m} drive`, { can: 40 + i, bus: 'can_s0' });
    const turn = b.dev('kraken-x60', x + 60, y, `${m} turn`, { can: 30 + i, bus: 'can_s0' });
    const enc = b.dev('cancoder', x + 160, y + 8, `${m} encoder`, { can: 50 + i, bus: 'can_s0' });
    b.wire('power', [pdh, `ch${ch++}`], [hat, 'in'], { note: CH_NOTE, fuseA: 40, awg: 10 });
    b.wire('power', [hat, 'out'], [drive, 'vbat_pos'], { awg: 10 });
    b.wire('power', [hat, 'tap'], [enc, 'pwr'], { note: 'Power hat: the CANcoder runs off its module drive motor.' });
    b.wire('power', [pdh, `ch${ch++}`], [turn, 'vbat_pos'], { note: CH_NOTE, fuseA: 40, awg: 10 });
    s0.push(krakenCan(drive), krakenCan(turn), ctreSensorCan(enc));
  });
  const pigeon = b.dev('pigeon2', 1180, 120, 'Gyro', { can: 0, bus: 'can_s0', tag: 'right', notes: 'Pigeon 2 gets its own fused slot (power-hat exception).' });
  b.wire('power', [pdh, 'ch17'], [pigeon, 'pwr'], { note: `Own fused 5 A slot. ${CH_NOTE}`, fuseA: 5 });
  const t0 = b.dev('can-terminator', 1180, 260, 'Term s0', { tag: 'right' });
  b.canChain([sc, 'can_s0'], [...s0, ctreSensorCan(pigeon)], t0);

  // the next free PDH channels for mechanisms
  let free = 8;
  return { sc, pdh, nextCh: () => free++ };
}

function robot2026(b: Builder): void {
  const { sc, pdh, nextCh } = base(b);
  const mech = (
    bus: string, x0: number, y: number,
    motors: { name: string; can: number; slug?: string }[],
  ) => {
    const ids = motors.map((m, i) => {
      const d = b.dev(m.slug ?? 'kraken-x60', x0 + i * 110, y, m.name, { can: m.can, bus });
      b.wire('power', [pdh, `ch${nextCh()}`], [d, 'vbat_pos'], { note: CH_NOTE, fuseA: 40, awg: m.slug === 'talon-fxs' ? 14 : 10 });
      return d;
    });
    const term = b.dev('can-terminator', x0 + motors.length * 110, y + 60, `Term ${bus.slice(-2)}`, { tag: 'bottom' });
    b.canChain([sc, bus], ids.map(krakenCan), term);
  };
  mech('can_s1', -420, -560, [{ name: 'Intake rack', can: 11 }, { name: 'Intake wheels', can: 12 }]);
  mech('can_s2', -420, -400, [{ name: 'Floor roller', can: 13 }, { name: 'Lower belt', can: 21 }, { name: 'Upper belt', can: 22 }]);
  mech('can_s3', -420, -240, [
    { name: 'Shooter lead', can: 27 }, { name: 'Shooter follow', can: 15 },
    { name: 'Turret', can: 16, slug: 'talon-fxs' }, { name: 'Hood', can: 20 },
  ]);
}

/** A fresh 5090 starting diagram, checked like a file that a person opens. */
export function templateDoc(id: TemplateId, catalog: Catalog | null): Doc {
  const b = new Builder();
  if (id === 'base') base(b);
  else robot2026(b);
  const t = TEMPLATES.find((x) => x.id === id);
  const doc: Doc = {
    format: 'paradox-diagram', version: 1, title: t?.title ?? '5090 robot',
    devices: b.devices, wires: b.wires, team: '5090 TorqueNados', revision: 'A',
  };
  return validateDoc(structuredClone(doc), catalog).doc;
}

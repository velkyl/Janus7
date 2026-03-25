export default {
  id: 'P6-TC-19',
  title: 'Lesson item sheet registered',
  phases: [6],
  kind: 'auto',
  expected: 'Lesson item document type and/or custom sheet registration exists.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const subtype = engine?.documents?.lesson?.subtype ?? null;
    const hasItemType = !!game?.model?.Item && Object.prototype.hasOwnProperty.call(game.model.Item, 'lesson');
    const ok = hasItemType || !!subtype;
    return { ok, summary: ok ? 'Lesson item sheet/document wiring vorhanden' : 'Lesson item sheet/document wiring fehlt', notes: [`hasItemType=${hasItemType}`, `subtype=${subtype ?? 'n/a'}`] };
  }
};

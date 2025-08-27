import { Journey, JourneyStep, Selector } from '../types';

describe('Type Definitions', () => {
  it('should define Journey type correctly', () => {
    const journey: Journey = {
      meta: {
        name: 'Test Journey',
        viewport: { w: 1920, h: 1080 },
      },
      start: {
        url: 'https://example.com',
      },
      steps: [],
      output: {
        preset: 'trailer',
        aspect: '16:9',
        captions: true,
      },
    };

    expect(journey.meta.name).toBe('Test Journey');
    expect(journey.start.url).toBe('https://example.com');
    expect(journey.output.preset).toBe('trailer');
  });

  it('should define JourneyStep type correctly', () => {
    const step: JourneyStep = {
      action: 'click',
      locator: {
        role: 'button',
        name: 'Submit',
      },
      cinema: {
        beat: 'impact',
        ripple: true,
      },
    };

    expect(step.action).toBe('click');
    expect(step.locator?.role).toBe('button');
    expect(step.cinema?.beat).toBe('impact');
  });

  it('should define Selector type correctly', () => {
    const selector: Selector = {
      by: 'role',
      value: 'button',
      name: 'Submit',
    };

    expect(selector.by).toBe('role');
    expect(selector.value).toBe('button');
    expect(selector.name).toBe('Submit');
  });
});
import { clampInt } from './fixed.mjs';

export class DrawQueue {
  constructor(bucketCount = 1500, maxFacesPerBucket = 512) {
    this.bucketCount = bucketCount;
    this.maxFacesPerBucket = maxFacesPerBucket;
    this.buckets = Array.from({ length: bucketCount }, () => []);
    this.sequence = 0;
  }

  clear() {
    for (const bucket of this.buckets) bucket.length = 0;
    this.sequence = 0;
  }

  add(command) {
    const depth = clampInt(Math.trunc(command.depth ?? 0), 0, this.bucketCount - 1);
    const bucket = this.buckets[depth];
    if (bucket.length >= this.maxFacesPerBucket) throw new RangeError(`Depth bucket ${depth} is full`);
    bucket.push({ ...command, depth, priority: clampInt(Math.trunc(command.priority ?? 0), 0, 11), sequence: this.sequence++ });
  }

  ordered() {
    const priorities = Array.from({ length: 12 }, () => []);
    for (let depth = this.bucketCount - 1; depth >= 0; depth -= 1) {
      for (const command of this.buckets[depth]) priorities[command.priority].push(command);
    }
    const average = (...indices) => {
      const faces = indices.flatMap(index => priorities[index]);
      return faces.length ? Math.trunc(faces.reduce((sum, face) => sum + face.depth, 0) / faces.length) : -1;
    };
    const thresholds = new Map([[0, average(1, 2)], [3, average(3, 4)], [5, average(6, 8)]]);
    const special = priorities[10].concat(priorities[11]).sort((a, b) => b.depth - a.depth || a.priority - b.priority || a.sequence - b.sequence);
    const result = [];
    let specialIndex = 0;
    for (let priority = 0; priority < 10; priority += 1) {
      const threshold = thresholds.get(priority);
      if (threshold !== undefined) {
        while (specialIndex < special.length && special[specialIndex].depth > threshold) result.push(special[specialIndex++]);
      }
      result.push(...priorities[priority]);
    }
    while (specialIndex < special.length) result.push(special[specialIndex++]);
    return result;
  }
}

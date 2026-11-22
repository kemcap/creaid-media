import { readFileSync } from 'node:fs';

const services = JSON.parse(readFileSync(new URL('./services.json', import.meta.url), 'utf8'));

export default Object.keys(services).filter((key) => services[key].generated);

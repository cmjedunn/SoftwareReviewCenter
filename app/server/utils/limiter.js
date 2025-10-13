import Bottleneck from 'bottleneck';

// controller-level rate limiter - ensures atomic business operations
const controllerLimiter = new Bottleneck({
  minTime: 100,        // 100ms between complete controller operations 
  maxConcurrent: 1     // Only 1 complete business operation at a time
});

// Add monitoring
controllerLimiter.on('received', (info) => {
  const queueSize = controllerLimiter.counts().QUEUED;
  if (queueSize >= 1) {
    console.log(`🚦 Controller queue: ${queueSize} operations waiting`);
  }
});

controllerLimiter.on('executing', (info) => {
  console.log('🔄 Controller operation starting...');
});

controllerLimiter.on('done', (info) => {
  const queueSize = controllerLimiter.counts().QUEUED;
  if (queueSize === 0) {
    console.log('✅ Controller operation completed. Queue empty');
  } else {
    console.log(`✅ Controller operation completed. ${queueSize} remaining in queue`);
  }
});

export { controllerLimiter };

// Wrap fetch with rate limiting
export const rateLimitedFetch = controllerLimiter.wrap(async (url, options = {}) => {
  return await fetch(url, options);
});
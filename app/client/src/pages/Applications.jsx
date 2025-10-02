import { useLoaderData } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PageWrapper, MainContent, AuthContent } from '../components/layout/Utils'
import { Card, GridCard } from '../components/layout/Card';
import { LaserFlowCard } from '../components/layout/LaserFlow';

// Global context manager to limit concurrent WebGL contexts
class LaserContextManager {
  constructor(maxContexts = 8) {
    this.maxContexts = maxContexts;
    this.activeContexts = new Set();
    this.pendingQueue = [];
  }

  requestContext(id, renderCallback, cleanupCallback) {
    if (this.activeContexts.has(id)) {
      return; // Already active
    }

    if (this.activeContexts.size < this.maxContexts) {
      // Space available, render immediately
      this.activeContexts.add(id);
      renderCallback();
    } else {
      // Add to queue
      this.pendingQueue.push({ id, renderCallback, cleanupCallback });
    }
  }

  releaseContext(id) {
    if (this.activeContexts.has(id)) {
      this.activeContexts.delete(id);
      
      // Process queue
      if (this.pendingQueue.length > 0) {
        const next = this.pendingQueue.shift();
        this.activeContexts.add(next.id);
        next.renderCallback();
      }
    }
  }

  forceReleaseContext(id) {
    this.releaseContext(id);
    // Remove from queue if pending
    this.pendingQueue = this.pendingQueue.filter(item => item.id !== id);
  }
}

const laserManager = new LaserContextManager(12); // Max 8 concurrent contexts

// Hook with debouncing
function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [debouncedIntersecting, setDebouncedIntersecting] = useState(false);
  const ref = useRef();
  const timeoutRef = useRef();

  useEffect(() => {
    // Debounce intersection changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedIntersecting(isIntersecting);
    }, isIntersecting ? 50 : 200); // Faster to show, slower to hide

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isIntersecting]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '150px', // Larger margin for smoother experience
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, debouncedIntersecting];
}

// Managed laser card component
function ManagedLaserCard({ cardId, ...cardProps }) {
  const [ref, isVisible] = useIntersectionObserver();
  const [shouldRender, setShouldRender] = useState(false);
  const requestedRef = useRef(false);

  const handleRender = useCallback(() => {
    setShouldRender(true);
  }, []);

  const handleCleanup = useCallback(() => {
    setShouldRender(false);
  }, []);

  useEffect(() => {
    if (isVisible && !requestedRef.current) {
      requestedRef.current = true;
      laserManager.requestContext(cardId, handleRender, handleCleanup);
    } else if (!isVisible && requestedRef.current) {
      requestedRef.current = false;
      laserManager.forceReleaseContext(cardId);
      setShouldRender(false);
    }

    return () => {
      if (requestedRef.current) {
        laserManager.forceReleaseContext(cardId);
      }
    };
  }, [isVisible, cardId, handleRender, handleCleanup]);

  return (
    <div ref={ref}>
      {shouldRender ? (
        <LaserFlowCard {...cardProps} />
      ) : (
        <div style={{ 
          width: cardProps.maxWidth || '50em', 
          height: cardProps.maxHeight || '20em',
          background: 'rgba(10, 10, 20, 0.9)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <h3 style={{ color: '#fff', margin: '0 0 8px 0' }}>{cardProps.applicationName}</h3>
          <p style={{ color: '#888', margin: '0 0 4px 0' }}>{cardProps.environment}</p>
          <p style={{ color: '#666', margin: '0', fontSize: '0.9em' }}>Records: {cardProps.recordCount}</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // Get the data from your loader
  const loaderData = useLoaderData();
  const resource = loaderData.resource || loaderData.resourse; // Handle typo in loader
  
  // DEBUG: Log the actual data structure
  console.log('🔍 Loader data:', loaderData);
  console.log('🔍 Resource:', resource);
  console.log('🔍 First application:', resource?.content?.[0]);
  
  // Handle loading state
  if (!resource || !resource.content) {
    return (
      <PageWrapper>
        <AuthContent>
          <div>Loading applications...</div>
        </AuthContent>
      </PageWrapper>
    );
  }

  // Theme options for variety
  const themes = ['green', 'orange', 'red', 'blue', 'purple', 'cyan'];

  return (
    <PageWrapper>
      <AuthContent>
        <GridCard>
          {resource.content.map((application, index) => {
            // Simplified extraction - just use safe fallbacks for now
            const applicationName = String(application.name || `Application ${index + 1}`);
            const environment = 'Production'; // Use static value until we see data structure
            const recordCount = 0; // Use static value until we see data structure
            
            // Cycle through themes for visual variety
            const theme = themes[index % themes.length];

            return (
              <ManagedLaserCard
                key={application.id || index}
                cardId={`laser-${application.id || index}`}
                applicationName={applicationName}
                environment={environment}
                recordCount={recordCount}
                theme={theme}
                maxWidth="50em"
                maxHeight="20em"
              />
            );
          })}
        </GridCard>
      </AuthContent>
    </PageWrapper>
  );
}
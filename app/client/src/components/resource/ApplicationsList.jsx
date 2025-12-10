import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMsal } from '@azure/msal-react';
import { Card } from '../layout/Card';
import { LaserFlowCard, PlaceholderCard } from '../layout/LaserFlow';
import styles from './styles/ApplicationsList.module.scss';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedFetch } from '../../hooks/useAutheticatedFetch';


// Placeholder card component for non-visible items
// const PlaceholderCard = ({ application, index, onLoadAnimation, onNavigate }) => {
//     const applicationName = String(application.name || `Application ${index + 1}`);
//     const assignee = application.assignee?.name || 'Unassigned';

//     // Extract maturity score using same logic as main cards
//     const maturityTierField = application.fields?.find(field =>
//         field.name === '[CALC] Current Year Average Control Maturity Tier'
//     );
//     const maturityScoreField = application.fields?.find(field =>
//         field.name === '[CALC] Overall Control Maturity Score'
//     );

//     let maturityValue = maturityTierField?.values?.[0]?.numericValue ?? maturityTierField?.values?.[0]?.textValue;
//     if (maturityValue === null || maturityValue === undefined || maturityValue === 'null') {
//         maturityValue = maturityScoreField?.values?.[0]?.numericValue ?? maturityScoreField?.values?.[0]?.textValue;
//     }

//     const hasMaturityData = maturityValue !== null && maturityValue !== undefined && maturityValue !== 'null';
//     const displayScore = hasMaturityData ? maturityValue : '0';

//     const handleClick = (e) => {
//         // If Ctrl/Cmd is held, load animation instead of navigating
//         if (e.ctrlKey || e.metaKey) {
//             onLoadAnimation();
//         } else {
//             onNavigate();
//         }
//     };

//     return (
//         <div
//             className={styles.placeholderCard}
//             onClick={handleClick}
//             style={{
//                 'max-height': '250px',
//                 width: "100 %"
//             }}
//             title="Click to view • Ctrl+Click to load animation"
//         >
//             <Card>
//                 <h3>{applicationName}</h3>
//                 <p>Assignee: {assignee}</p>
//                 <p>Maturity: {displayScore}</p>
//             </Card>
//         </div>
//     );
// };

// Search component with "Assigned to Me" filter
const SearchBar = ({ searchTerm, onSearchChange, assignedToMeFilter, onAssignedToMeChange, resultCount, currentUserEmail }) => {
    return (
        <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
                <input
                    type="text"
                    placeholder="Search applications by name, assignee, or status..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={styles.searchInput}
                />
                <div className={styles.searchIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                </div>
            </div>

            <div className={styles.filterRow}>
                <button
                    className={`${styles.filterButton} ${assignedToMeFilter ? styles.filterActive : ''}`}
                    onClick={() => onAssignedToMeChange(!assignedToMeFilter)}
                    disabled={!currentUserEmail}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    Assigned to Me
                    {assignedToMeFilter && currentUserEmail && (
                        <span className={styles.filterBadge}>
                            {currentUserEmail.split('@')[0]}
                        </span>
                    )}
                </button>

                {resultCount !== undefined && (
                    <div className={styles.resultCount}>
                        {resultCount} application{resultCount !== 1 ? 's' : ''} found
                        {assignedToMeFilter && <span className={styles.filterIndicator}> • Assigned to Me</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function ApplicationsList() {
    const backend = import.meta.env.VITE_BACKEND_URL || "";
    const [applications, setApplications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignedToMeFilter, setAssignedToMeFilter] = useState(false);
    const [visibleCards, setVisibleCards] = useState(new Set());
    const observerRef = useRef(null);
    const cardRefs = useRef(new Map());
    const navigate = useNavigate();
    const fetch = useAuthenticatedFetch();
    


    // Get current user from MSAL
    const { instance } = useMsal();
    const account = instance.getActiveAccount();
    const currentUserEmail = account?.username; // MSAL typically stores email as username

    // WebGL context management
    const MAX_VISIBLE_CARDS = 5; // Strict limit to prevent WebGL context issues
    const visibleCardsArrayRef = useRef([]); // Track order of visibility

    useEffect(() => {
        fetch(`${backend}/api/applications`)
            .then(res => res.json())
            .then(data => {
                // Handle both direct array and wrapped response
                const appArray = Array.isArray(data) ? data : data.content || [];
                setApplications(appArray);
            })
            .catch(console.error);
    }, [backend]);

    // Advanced search and filter function
    const filteredApplications = useMemo(() => {
        if (!applications.length) return [];

        let filtered = applications;

        // Apply "assigned to me" filter first
        if (assignedToMeFilter && currentUserEmail) {
            filtered = filtered.filter(app =>
                app.assignee?.email?.toLowerCase() === currentUserEmail.toLowerCase()
            );
        }

        // Then apply text search if there's a search term
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(app => {
                // Search in main application name
                if (app.name?.toLowerCase().includes(searchLower)) return true;

                // Search in record name
                if (app.recordName?.toLowerCase().includes(searchLower)) return true;

                // Search in status
                if (app.status?.toLowerCase().includes(searchLower)) return true;

                // Search in assignee name/email
                if (app.assignee?.name?.toLowerCase().includes(searchLower)) return true;
                if (app.assignee?.email?.toLowerCase().includes(searchLower)) return true;

                // Search in creator name/email
                if (app.creator?.name?.toLowerCase().includes(searchLower)) return true;
                if (app.creator?.email?.toLowerCase().includes(searchLower)) return true;

                // Search in workflow name
                if (app.workflow?.name?.toLowerCase().includes(searchLower)) return true;

                // Search in field values (like Application Name, Summary, etc.)
                if (app.fields?.some(field => {
                    // Search field names/labels
                    if (field.name?.toLowerCase().includes(searchLower)) return true;
                    if (field.label?.toLowerCase().includes(searchLower)) return true;

                    // Search field values
                    return field.values?.some(value =>
                        value.textValue?.toLowerCase().includes(searchLower)
                    );
                })) return true;

                return false;
            });
        }

        return filtered;
    }, [applications, searchTerm, assignedToMeFilter, currentUserEmail]);

    // More aggressive intersection observer with strict limits
    useEffect(() => {
        if (!observerRef.current) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    setVisibleCards(prev => {
                        const currentVisibleArray = visibleCardsArrayRef.current;
                        const newVisible = new Set(prev);

                        entries.forEach(entry => {
                            const index = parseInt(entry.target.dataset.index);

                            if (entry.isIntersecting) {
                                // Only add if under limit or if replacing an existing one
                                if (newVisible.size < MAX_VISIBLE_CARDS) {
                                    newVisible.add(index);
                                    if (!currentVisibleArray.includes(index)) {
                                        currentVisibleArray.push(index);
                                    }
                                } else {
                                    // Remove oldest visible card to make room
                                    const oldestIndex = currentVisibleArray.shift();
                                    if (oldestIndex !== undefined) {
                                        newVisible.delete(oldestIndex);
                                    }
                                    newVisible.add(index);
                                    currentVisibleArray.push(index);
                                }
                            } else {
                                newVisible.delete(index);
                                const arrayIndex = currentVisibleArray.indexOf(index);
                                if (arrayIndex > -1) {
                                    currentVisibleArray.splice(arrayIndex, 1);
                                }
                            }
                        });

                        // Safety check: never exceed MAX_VISIBLE_CARDS
                        if (newVisible.size > MAX_VISIBLE_CARDS) {
                            console.warn(`WebGL safety: Visible cards (${newVisible.size}) exceeded limit (${MAX_VISIBLE_CARDS}). Removing excess.`);
                            const visibleArray = Array.from(newVisible);
                            const excess = visibleArray.slice(0, visibleArray.length - MAX_VISIBLE_CARDS);
                            excess.forEach(index => {
                                newVisible.delete(index);
                                const arrayIndex = currentVisibleArray.indexOf(index);
                                if (arrayIndex > -1) {
                                    currentVisibleArray.splice(arrayIndex, 1);
                                }
                            });
                        }

                        visibleCardsArrayRef.current = currentVisibleArray;
                        return newVisible;
                    });
                },
                {
                    root: null,
                    rootMargin: '20px', // Reduced from 50px for tighter control
                    threshold: 0.3 // Increased from 0.1 - card must be more visible to activate
                }
            );
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    // Clear visible cards when search or filter changes and reset tracking
    useEffect(() => {
        setVisibleCards(new Set());
        cardRefs.current.clear();
        visibleCardsArrayRef.current = [];
    }, [searchTerm, assignedToMeFilter]);

    // Set up refs and observer for each card
    const setCardRef = useCallback((element, index) => {
        const observer = observerRef.current;
        if (!observer) return;

        const previousRef = cardRefs.current.get(index);
        if (previousRef) {
            observer.unobserve(previousRef);
        }

        if (element) {
            cardRefs.current.set(index, element);
            observer.observe(element);
        } else {
            cardRefs.current.delete(index);
        }
    }, []);

    const handleApplicationClick = (application) => {
        if (application) {
            navigate(`/applications/${application.id}`, {
                state: { application }
            });
        } else {
            console.log('No application ID');
        }
    };

    // Helper function to get application display data
    const getApplicationDisplayData = (app, index) => {
        const applicationName = app.name || `Application ${index + 1}`;

        // Try both maturity fields
        const maturityTierField = app.fields?.find(field =>
            field.name === '[CALC] Current Year Average Control Maturity Tier'
        );
        const maturityScoreField = app.fields?.find(field =>
            field.name === '[CALC] Overall Control Maturity Score'
        );

        // Try tier field first, then score field
        let maturityValue = maturityTierField?.values?.[0]?.numericValue ?? maturityTierField?.values?.[0]?.textValue;
        if (maturityValue === null || maturityValue === undefined || maturityValue === 'null') {
            maturityValue = maturityScoreField?.values?.[0]?.numericValue ?? maturityScoreField?.values?.[0]?.textValue;
        }

        // Check if we have valid maturity data
        const hasMaturityData = maturityValue !== null && maturityValue !== undefined && maturityValue !== 'null';
        const displayScore = hasMaturityData ? maturityValue : '0';

        // Determine theme based on workflow status AND data quality
        let theme = 'blue'; // Default
        if (app.currentStep?.type === 'ORIGIN') {
            theme = 'red'; // Red for START/ORIGIN - always priority
        } else if (app.currentStep?.type === 'END' && hasMaturityData) {
            theme = 'green'; // Green for completed WITH data
        } else if (!hasMaturityData) {
            theme = 'orange'; // Orange for missing data (any step except ORIGIN)
        } else if (app.currentStep?.type === 'END') {
            theme = 'green'; // Green for completed (fallback)
        } else if (app.currentStep?.type) {
            theme = 'blue'; // Blue for in-progress with data
        }

        return { applicationName, maturityScore: displayScore, theme };
    };

    if (!applications.length) {
        return (
            <Card className={styles.card}>
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#9ca3af'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>:(</div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                        No applications have been submitted yet.
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Submit an application using the form on the left.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className={styles.card}>
            <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                assignedToMeFilter={assignedToMeFilter}
                onAssignedToMeChange={setAssignedToMeFilter}
                resultCount={filteredApplications.length}
                currentUserEmail={currentUserEmail}
            />

            <div className={styles.list}>
                {filteredApplications.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>
                            {assignedToMeFilter && searchTerm
                                ? `No applications assigned to you match "${searchTerm}"`
                                : assignedToMeFilter
                                    ? "No applications assigned to you"
                                    : searchTerm
                                        ? `No applications found matching "${searchTerm}"`
                                        : "No applications found"
                            }
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setAssignedToMeFilter(false);
                            }}
                            className={styles.clearSearchButton}
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    filteredApplications.map((application, index) => {
                        const { applicationName, maturityScore, theme } = getApplicationDisplayData(application, index);
                        const isVisible = visibleCards.has(index);

                        return (
                            <div
                                key={application.id || `${application.name}-${index}`}
                                ref={(el) => setCardRef(el, index)}
                                data-index={index}
                            >
                                {isVisible ? (
                                    <LaserFlowCard
                                        title={applicationName}
                                        description={`Assigned to ${application.assignee?.name || 'Unassigned'}`}
                                        metricValue={maturityScore}
                                        metricLabel="Maturity Score"
                                        theme={theme}
                                        onClick={() => handleApplicationClick(application)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                ) : (
                                    <PlaceholderCard
                                        title={applicationName}
                                        description={`Assigned to ${application.assignee?.name || 'Unassigned'}`}
                                        metricValue={maturityScore}
                                        metricLabel="Maturity Score"
                                        theme={theme}
                                        onClick={() => handleApplicationClick(application)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </Card>
    );
}
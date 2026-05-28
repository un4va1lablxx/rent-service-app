import { useState } from "react";

export function Metric({label, value}) {
    return (
        <article className="metric-card glass">
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    );
}

export function Field({ label, children, wide = false }) {
    return (
        <label className={`field ${wide ? "field-wide" : ""}`}>
            <span>{label}</span>
            {children}
        </label>
    );
}

export function Fact({ label, value }) {
    return (
        <div className="fact">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

export function Modal({ children, onClose, wide = false }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className={`modal-card glass ${wide ? "wide" : ""}`} onClick={(event) => event.stopPropagation()}>
                <button className="modal-close" onClick={onClose} title="Закрыть">
                    <Icon name="close" />
                </button>
                {children}
            </div>
        </div>
    );
}

export function Icon({ name, isActive = false, onAnimationEnd }) {
    const [animating, setAnimating] = useState(false);

    const handleClick = () => {
        if (name === "heart") {
            setAnimating(true);
            setTimeout(() => {
                setAnimating(false);
                if (onAnimationEnd) onAnimationEnd();
            }, 300);
        }
    };

    if (name === "heart") {
        return (
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`heart-icon ${isActive ? "liked" : ""} ${animating ? "animate" : ""}`}
                onClick={handleClick}
            >
                <path
                    d="M12 20.5 4.8 13.6a4.9 4.9 0 0 1 6.9-6.9L12 7l.3-.3a4.9 4.9 0 1 1 6.9 6.9L12 20.5Z"
                    fill={isActive ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    if (name === "logout") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M6 6 18 18M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}

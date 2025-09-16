import { useEffect, useState } from "react";

export default function CountDown(){
    const [secondsRemaining, setSecondsRemaining] = useState<number>(3);

    useEffect(() => {
        setSecondsRemaining(3);
        const intervalId = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (secondsRemaining === 0) {
            window.alert("next round has begun");
        }
    }, [secondsRemaining]);

    return (
        <div className="countdown-container">
            <video className="countdown-bg-video" autoPlay muted loop playsInline src="public/scrum.mp4" 
            />
            <div className="countdown-card">
            <div className="countdown-header">
                <div className="countdown-header-icon">🏉</div>
                <h1 className="countdown-heading">Springbok Quiz</h1>
            </div>
            <p className="next-round"> NEXT ROUND</p>
            <hr className="countdown-divider"/>

            <div className="countdown">{secondsRemaining}</div>
            <div className="begins-in">Begins In</div>
            </div>
        </div>
    )
}
import { Link } from "react-router";
import { notFound } from "../../content/site";
import styles from "./not-found.module.css";

export default function NotFound(): React.JSX.Element {
  return (
    <article className={styles.page}>
      <svg className={styles.survey} viewBox="0 0 1200 500" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="survey-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M100 0H0V100" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1200" height="500" fill="url(#survey-grid)" />
        <path
          d="M0 340 120 310 210 352 330 300 420 330 470 286 M730 214 820 240 930 190 1040 226 1200 180"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path d="M470 286 730 214" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 16" />
      </svg>
      <p className={styles.code}>{notFound.code}</p>
      <h1 className={styles.title}>{notFound.title}</h1>
      <div className={styles.lines}>
        {notFound.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <Link className={styles.back} to="/">
          {notFound.returnLabel}
        </Link>
      </div>
    </article>
  );
}

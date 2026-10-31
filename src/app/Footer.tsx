import { Link } from "react-router";
import { footer, nav } from "../content/site";
import styles from "./Footer.module.css";

export function Footer(): React.JSX.Element {
  return (
    <footer className={styles.footer}>
      <p className={styles.decree}>{footer.decree}</p>
      <ul className={styles.nav}>
        {nav.map((item) => (
          <li key={item.id}>
            <Link to={item.path}>{item.label}</Link>
          </li>
        ))}
      </ul>
      <p className={styles.notice}>{footer.fanNotice}</p>
      <p className={styles.notice}>{footer.privacyNote}</p>
    </footer>
  );
}

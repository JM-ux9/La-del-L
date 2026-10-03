import bannerImg from '../assets/banner.jpg';
import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      <img src={bannerImg.src} alt="Banner de la cafetería" />
      <h2 style={{fontSize: '2rem'}}>Bienvenido a la <span className="aurora-text">Cafe del L</span></h2>
    </section>
  );
}

export default Hero;
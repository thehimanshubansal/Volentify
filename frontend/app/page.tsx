'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowUpRight } from 'lucide-react';

// SSR-safe dynamic imports for background 3D Globe & MapLibre GIS Canvas
const HeroGlobe = dynamic(() => import('@/components/3d/HeroGlobe'), {
  ssr: false,
});

const DisasterGISMap = dynamic(() => import('@/components/map/DisasterGISMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[640px] rounded-3xl bg-background/80 border border-white/[0.06] flex items-center justify-center font-mono text-xs text-slate-500">
      [Loading GIS Satellite Canvas...]
    </div>
  ),
});

export default function HomePage() {
  return (
    <div className="bg-background text-slate-300 space-y-32 sm:space-y-44 pb-32">
      
      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: HERO (Globe Ambient Background Behind Headline)   */}
      {/* ------------------------------------------------------------- */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center max-w-7xl mx-auto px-6 pt-16 pb-12 overflow-hidden">
        
        {/* Ambient 3D Globe Background Layer */}
        <div className="absolute inset-0 z-0 opacity-70 pointer-events-none flex items-center justify-center">
          <HeroGlobe />
        </div>

        {/* Centered Editorial Copy Overlay */}
        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-slate-400 backdrop-blur-md">
            <span>HUMANITARIAN TECHNOLOGY ORGANIZATION</span>
          </div>

          <h1 className="heading-hero text-5xl sm:text-7xl lg:text-8xl text-white tracking-tight leading-[1.05]">
            Intelligence for every disaster. <br />
            <span className="text-slate-400 italic font-serif">Humanity for every response.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Volentify unifies live satellite GIS telemetry, machine learning hazard forecasting, and rapid volunteer dispatch across India.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/map"
              className="px-8 py-4 rounded-full bg-primary text-slate-950 text-sm font-semibold hover:bg-primary-hover transition-all flex items-center space-x-2 shadow-lg"
            >
              <span>Explore GIS Canvas</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/volunteer"
              className="px-6 py-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors backdrop-blur-md"
            >
              Become a Volunteer
            </Link>
          </div>
        </div>

      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: LIVE CRISIS OVERVIEW (Full-Width GIS Platform)    */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="font-mono text-xs text-primary uppercase tracking-widest">REAL-TIME PLATFORM</span>
            <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
              Live National GIS Telemetry
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md font-light">
            Continuous meteorological observation, flood inundation models, and verified NDRF battalion locations.
          </p>
        </div>

        {/* Full-width GIS Canvas Frame */}
        <div className="w-full h-[640px] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl relative">
          <DisasterGISMap />
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: MISSION (Humanitarian Documentary Photography)     */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        <div className="lg:col-span-6 space-y-8">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">OUR PURPOSE</span>
          <h2 className="heading-editorial text-4xl sm:text-6xl text-white leading-tight">
            Put people first. <br />
            Let technology serve humanity.
          </h2>
          <blockquote className="font-serif italic text-xl text-slate-300 border-l-2 border-primary pl-6 py-1">
            "Disasters don't wait for administrative delays. Seconds saved in volunteer dispatch save human lives."
          </blockquote>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            We build open, resilient technology for citizens, emergency responders, and government agencies—ensuring that every community in India receives timely alerts and immediate ground support.
          </p>
        </div>

        {/* High-Resolution Humanitarian Documentary Photo */}
        <div className="lg:col-span-6">
          <div className="img-editorial aspect-[4/3] w-full">
            <img
              src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"
              alt="Humanitarian Response Operations"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: OUR PLATFORM (Apple-Style Alternating Features)   */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 space-y-32">
        
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">THE SYSTEM</span>
          <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
            Architecture for Crisis Scale
          </h2>
        </div>

        {/* Feature 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="font-mono text-xs text-primary">01 / GIS & SATELLITE ENGINE</span>
            <h3 className="heading-editorial text-3xl sm:text-4xl text-white">
              Multi-Spectral Satellite Telemetry
            </h3>
            <p className="text-sm text-slate-400 font-light leading-relaxed">
              Direct ingestion of INSAT-3DR and Sentinel infrared telemetry. Monitor cloud motion vectors, ocean sea surface temperatures, and river hydrographs with sub-meter spatial accuracy.
            </p>
            <Link href="/map" className="inline-flex items-center space-x-1 text-xs font-medium text-white hover:text-primary">
              <span>View Live GIS Layers →</span>
            </Link>
          </div>
          <div className="lg:col-span-6">
            <div className="img-editorial aspect-[16/10] w-full">
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80"
                alt="Satellite Earth Telemetry"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="img-editorial aspect-[16/10] w-full">
              <img
                src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80"
                alt="Rescue and Field Logistics"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
            <span className="font-mono text-xs text-primary">02 / DISPATCH NETWORK</span>
            <h3 className="heading-editorial text-3xl sm:text-4xl text-white">
              Geo-Targeted Volunteer Dispatch
            </h3>
            <p className="text-sm text-slate-400 font-light leading-relaxed">
              Spatial matching connects verified first-responders (Medical, Search & Rescue, Logistics) directly with district authority requests during active emergency evacuations.
            </p>
            <Link href="/volunteer" className="inline-flex items-center space-x-1 text-xs font-medium text-white hover:text-primary">
              <span>Join Response Corps →</span>
            </Link>
          </div>
        </div>

      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 5: INTELLIGENCE & ML PREDICTIONS                      */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-6 space-y-6">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">MACHINE LEARNING</span>
          <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
            Forecasting risks 48 hours ahead.
          </h2>
          <p className="text-sm text-slate-400 font-light leading-relaxed">
            XGBoost probability classifiers and DistilBERT NLP models process weather anomalies and local incident reports, predicting storm surge landfall points before destruction occurs.
          </p>
          <div className="pt-2 font-mono text-xs text-slate-400 space-y-2">
            <div>• Storm Surge Model Confidence: <strong className="text-white">94.8%</strong></div>
            <div>• Situation Report NLP Precision: <strong className="text-white">98.1%</strong></div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="img-editorial aspect-[4/3] w-full">
            <img
              src="https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1200&q=80"
              alt="Predictive Weather Radar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 6: VOLUNTEER NETWORK (Human Stories & Rescue)        */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="max-w-xl space-y-3">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">HUMAN NETWORK</span>
          <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
            12,400+ First Responders on the Ground
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="img-editorial aspect-[4/3] w-full">
              <img
                src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80"
                alt="Search & Rescue Operations"
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="font-serif text-xl text-white">Search & Rescue Teams</h4>
            <p className="text-xs text-slate-400 font-light">Certified motorboat operators clearing inundated coastal villages in Odisha and Assam.</p>
          </div>

          <div className="space-y-4">
            <div className="img-editorial aspect-[4/3] w-full">
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
                alt="Emergency Medical Camps"
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="font-serif text-xl text-white">Medical Triage Camps</h4>
            <p className="text-xs text-slate-400 font-light">Doctors and blood donors providing emergency care at designated relief shelters.</p>
          </div>

          <div className="space-y-4">
            <div className="img-editorial aspect-[4/3] w-full">
              <img
                src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80"
                alt="Relief Food Logistics"
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="font-serif text-xl text-white">Food & Water Logistics</h4>
            <p className="text-xs text-slate-400 font-light">Distributing clean drinking water purification kits and dry food packs.</p>
          </div>
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 7: AGENCIES & COORDINATION WORKFLOW                    */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-6 space-y-6">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">COORDINATION WORKFLOW</span>
          <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
            Unified command for NDRF & District Authorities.
          </h2>
          <div className="space-y-4 font-mono text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-surface border border-white/[0.06]">
              <strong className="text-white block mb-1">1. GIS Hazard Detection</strong>
              Automatic anomaly alert triggered via satellite hydrograph.
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-white/[0.06]">
              <strong className="text-white block mb-1">2. Authority Requisition</strong>
              District magistrate issues shelter opening and volunteer request.
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-white/[0.06]">
              <strong className="text-white block mb-1">3. Instant Ground Deployment</strong>
              Nearby certified volunteers receive geofenced dispatch SMS.
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="img-editorial aspect-[4/3] w-full">
            <img
              src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
              alt="Command Operations Workflow"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 8: MINIMAL RESTRAINED STATISTICS                      */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 border-y border-white/[0.06] py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 font-mono">
          <div>
            <div className="text-4xl font-serif text-white">12,480+</div>
            <div className="text-xs text-slate-400 mt-2">Active Volunteers</div>
          </div>
          <div>
            <div className="text-4xl font-serif text-white">482</div>
            <div className="text-xs text-slate-400 mt-2">Relief Shelters Connected</div>
          </div>
          <div>
            <div className="text-4xl font-serif text-white">720</div>
            <div className="text-xs text-slate-400 mt-2">Indian Districts Covered</div>
          </div>
          <div>
            <div className="text-4xl font-serif text-white">22 Mins</div>
            <div className="text-xs text-slate-400 mt-2">Avg Dispatch Speed</div>
          </div>
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 9: RESEARCH & PUBLICATIONS                            */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="max-w-xl space-y-3">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">RESEARCH</span>
          <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
            Peer-Reviewed Open Science
          </h2>
        </div>

        <div className="p-8 rounded-3xl bg-surface border border-white/[0.06] space-y-4">
          <span className="font-mono text-xs text-primary">IEEE DISASTER GIS 2026</span>
          <h3 className="font-serif text-2xl text-white">
            Spatial Hazard Probability Estimation via XGBoost & High-Resolution Infrared Telemetry in Coastal India
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Demonstrating 94.8% accuracy in coastal inundation boundary modeling using sparse volunteer crowdsourced inputs and INSAT-3DR satellite observations.
          </p>
          <Link href="/research" className="inline-flex items-center space-x-1 text-xs text-white font-medium hover:text-primary pt-2">
            <span>Read Publication PDF →</span>
          </Link>
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 10: NGO PARTNERS                                      */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6 space-y-12 pb-20">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">COLLABORATION</span>
          <h2 className="heading-editorial text-4xl sm:text-5xl text-white">
            Our NGO Partners
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Working hand-in-hand with renowned humanitarian organizations to accelerate disaster response.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-70 hover:opacity-100 transition-opacity duration-500">
          <div className="font-serif text-2xl text-slate-300 font-bold tracking-tight flex items-center space-x-2">
            <span className="text-primary">+</span> <span>Red Cross India</span>
          </div>
          <div className="font-serif text-2xl text-slate-300 font-bold tracking-tight flex items-center space-x-2">
            <span className="text-primary">+</span> <span>Oxfam</span>
          </div>
          <div className="font-serif text-2xl text-slate-300 font-bold tracking-tight flex items-center space-x-2">
            <span className="text-primary">+</span> <span>Save the Children</span>
          </div>
          <div className="font-serif text-2xl text-slate-300 font-bold tracking-tight flex items-center space-x-2">
            <span className="text-primary">+</span> <span>Doctors W/O Borders</span>
          </div>
        </div>
      </section>


      {/* ------------------------------------------------------------- */}
      {/* SECTION 11: CALL TO ACTION                                    */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="p-16 rounded-4xl bg-gradient-to-br from-surface to-background border border-white/[0.08] text-center space-y-8 max-w-4xl mx-auto">
          <h2 className="heading-editorial text-4xl sm:text-6xl text-white">
            Join the humanitarian response network.
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
            Whether you are a certified first-responder, medical professional, or district authority, your participation strengthens India's crisis resilience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/volunteer"
              className="px-8 py-4 rounded-full bg-primary text-slate-950 text-sm font-semibold hover:bg-primary-hover transition-all shadow-lg"
            >
              Become a Volunteer
            </Link>
            <Link
              href="/resources"
              className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              Emergency Helplines
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

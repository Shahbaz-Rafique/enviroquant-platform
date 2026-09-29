'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { GlowingCard } from '@/components/site/glowing-card'
import { SectionReveal } from '@/components/site/section-reveal'
import { SiteShell } from '@/components/site/site-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'

export function GreenButton ({
  href,
  children,
  outline = false
}: Readonly<{ href: string; children: string; outline?: boolean }>) {
  return (
    <Button
      asChild
      className='h-12 rounded-2xl px-6 text-lg font-normal tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(0,245,212,0.3)]'
    >
      <Link
        href={href}
        className={
          outline
            ? 'border-2 border-[#77A63C] bg-transparent text-white hover:!bg-[#77A63C]'
            : '!bg-[#77A63C] text-white shadow-[0_0_18px_rgba(0,245,212,0.22)] hover:!bg-[#77A63C]'
        }
      >
        {children}
      </Link>
    </Button>
  )
}

function SectionHeading ({
  title,
  eyebrow,
  titleClassName
}: Readonly<{ title: string; eyebrow?: string; titleClassName?: string }>) {
  return (
    <div className='max-w-3xl'>
      {eyebrow ? (
        <p className='mb-3 text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]'>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`text-4xl font-medium tracking-tight text-white ${
          titleClassName || ''
        }`}
      >
        {title}
      </h2>
    </div>
  )
}

function HomeHeroBackdrop () {
  return (
    /* The bg-black container ensures the image fades into pitch black, exactly like your photo */
    <div className='pointer-events-none h-screen absolute inset-0 overflow-hidden isolate'>
      <Image
        src='/images/hero-left.png'
        alt='Hero Backdrop'
        className='absolute left-0 top-0 object-cover object-left'
        fill
        //priority
      />
      {/* The solid matching background mask overlay */}
      <div className='gradient-mask  absolute inset-0 z-1' />
    </div>
  )
}

export function HomeMarketingPage () {
  const reduceMotion = useReducedMotion()

  return (
    <SiteShell>
      <section className='relative min-h-full px-5 pb-16 pt-24 sm:px-8 lg:px-12 lg:pt-0'>
        <HomeHeroBackdrop />
        <div className='mx-auto grid min-h-screen max-w-7xl items-center gap-10'>
          <div className='relative ml-auto w-full max-w-5xl pt-6 text-right sm:min-h-[42rem] lg:min-h-[50rem]'>
            <motion.div
              className='relative right-0 top-0 z-20 w-full lg:absolute lg:top-44'
              animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={{
                duration: 8.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <GlowingCard
                intensity='strong'
                className='flex min-h-0 w-full flex-col items-end p-6 text-right sm:min-h-[32rem] sm:p-10'
              >
                <div className='max-w-2xl'>
                  <h2 className='mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.45rem] lg:leading-[1.02]'>
                    AI-Powered Environmental Impact Assessments. Evidence Before Conclusions.
                  </h2>
                  <p className='mt-6 text-lg leading-8 text-white/74 sm:text-2xl'>
                    EnviroQuant transforms how consultant teams create, review, and deliver structured EIAs &mdash; with AI-assisted compliance, collaborative workflows, and full traceability.
                  </p>
                </div>
                <div className='mt-8 flex w-full flex-wrap justify-end gap-4'>
                  <GreenButton href='#capabilities' outline>
                    Our Capabilities
                  </GreenButton>
                  <GreenButton href='/register'>Start Your First EIA</GreenButton>
                </div>
              </GlowingCard>
            </motion.div>
          </div>

          <GlowingCard className='mt-8 flex max-h-none p-0 !overflow-visible lg:max-h-[28rem]'>
            {' '}
            {/* Removed padding from className */}
            <div className='p-6 sm:p-12 lg:p-20 lg:py-32'>
              <SectionHeading title='The EIA Challenge' />
              <p className='mt-8 max-w-xl text-lg font-normal text-white/74 sm:text-xl'>
                Environmental Impact Assessments are critical to responsible development &mdash; yet the process is still fragmented across spreadsheets, emails, and disconnected teams. Compliance gaps go undetected, review cycles drag on for months, and evidence trails are lost. EnviroQuant was built to change that.
              </p>
            </div>
            {/* Decorative Glowing Image */}
          </GlowingCard>

          <Image
            src='/images/charge.png'
            alt='Charge'
            width={786}
            height={900}
            //priority
            className='absolute right-0  z-20 -bottom-20 '
          />
        </div>
      </section>

      <section className='relative isolate mt-20 px-5 py-10 sm:mt-32 sm:px-8 lg:px-12'>
        <Image
          src='/images/left-hand.png'
          alt='Left Hand'
          width={500}
          height={500}
          //priority
          className='absolute left-[-3.5rem] top-[-4.5rem] z-10 h-auto w-[8rem] max-w-[34vw] opacity-50 sm:left-[-2rem] sm:top-[-7rem] sm:w-[11rem] lg:hidden'
        />
        <Image
          src='/images/left-hand.png'
          alt='Left Hand'
          width={500}
          height={500}
          //priority
          className='absolute left-0 -top-full z-10 hidden lg:block'
        />
        <Image
          src='/images/right-hand.png'
          alt='Right Hand'
          width={500}
          height={500}
          //priority
          className='absolute -right-8 top-8 z-1 h-auto w-[8rem] max-w-[34vw] opacity-50 sm:right-[-1rem] sm:top-2 sm:w-[11rem] lg:hidden'
        />
        <Image
          src='/images/right-hand.png'
          alt='Right Hand'
          width={500}
          height={500}
          //priority
          className='absolute -right-10  z-1 hidden lg:block'
        />
        <div className='mx-auto relative grid max-w-7xl gap-6 lg:grid-cols-2'>
          {[
            {
              title: 'Structured EIA Authoring',
              text: 'Build complete Environmental Impact Assessments using a proven 8-section checklist framework. Every section and subsection is mapped to regulatory requirements, ensuring nothing is missed. Assign domain specialists to the right sections and track progress in real time.'
            },
            {
              title: 'AI-Assisted Compliance Review',
              text: 'Run AI-powered evaluations that check every subsection against regulatory standards. Get severity-rated findings with evidence citations, track remediation status, and compare evaluation runs over time. The AI assists — your experts decide.'
            }
          ].map((card, index) => (
            <SectionReveal
              key={card.title}
              from={index === 0 ? 'left' : 'right'}
              delay={index * 0.08}
            >
              <GlowingCard
                intensity='strong'
                className='min-h-[18rem] p-6 sm:min-h-[20rem] sm:p-10'
              >
                <div className='flex h-full flex-col justify-between items-center text-center'>
                  <div>
                    <h3 className='mt-4 text-3xl font-medium text-white sm:text-4xl'>
                      {card.title}
                    </h3>
                    <p className='mt-5 max-w-lg text-base leading-8 text-white/72 sm:text-lg'>
                      {card.text}
                    </p>
                  </div>
                </div>
              </GlowingCard>
            </SectionReveal>
          ))}
        </div>
      </section>

      <section id='capabilities' className='mt-14 w-full px-5 py-16 sm:mt-20 sm:px-8 sm:py-20 lg:px-12'>
        <div className='relative mx-auto flex h-auto flex-col items-center'>
          <SectionReveal from='up'>
            <SectionHeading
              title='What EnviroQuant Delivers'
              titleClassName='text-center font-bold text-4xl sm:text-5xl'
            />
          </SectionReveal>
          <Image
            src='/images/leaf.png'
            alt='Leaf'
            fill
            //priority
            className='absolute inset-0 h-auto object-contain object-center opacity-18 translate-y-20 sm:translate-y-28 lg:hidden'
          />
          <Image
            src='/images/leaf.png'
            alt='Leaf'
            fill
            //priority
            className='absolute hidden object-cover translate-y-40 h-auto lg:block'
          />
          <div className='relative mt-14 grid h-full w-full min-h-0 gap-6 lg:min-h-[44rem]'>
            {[
              {
                title: 'Collaborative Workflows',
                description:
                  'Assign authors and reviewers to sections. A 7-state controlled workflow ensures every subsection is written, reviewed, and approved.'
              },
              {
                title: 'Source Document Intelligence',
                description:
                  'Upload baseline studies, surveys, and reports. AI extracts content chunks for direct source-to-subsection mapping and traceability.'
              },
              {
                title: 'Evidence-First Assessment',
                description:
                  'Every finding and recommendation is grounded in traceable evidence. No conclusion stands without a verifiable basis.'
              },
              {
                title: 'Export & Reporting',
                description:
                  'Export completed EIAs and evaluation reports as PDF, DOCX, or JSON. Ready for regulatory submission and stakeholder review.'
              }
            ].map((card, index) => {
              const positions = [
                'lg:top-5 lg:left-0',
                'lg:top-0 lg:right-0',
                'lg:bottom-20 lg:left-0',
                'lg:bottom-0 lg:right-0'
              ]
              return (
                <SectionReveal
                  key={card.title}
                  from={index % 2 === 0 ? 'left' : 'right'}
                  delay={index * 0.08}
                  className={`w-full lg:absolute lg:w-fit ${positions[index]}`}
                >
                  <GlowingCard
                    intensity='strong'
                    className='relative z-10 px-6 py-6 sm:px-8'
                  >
                    <h3 className='mt-4 text-2xl font-medium text-white sm:text-3xl'>
                      {card.title}
                    </h3>
                    <p className='mt-4 max-w-sm text-sm leading-7 text-white/72 sm:text-base'>
                      {card.description}
                    </p>
                  </GlowingCard>
                </SectionReveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className='px-5 py-20 sm:px-8 lg:px-12'>
        <GlowingCard className='mx-auto max-w-5xl px-6 py-8 sm:px-8'>
          <SectionReveal from='scale' className='grid gap-8 lg:grid-cols-2'>
            <div>
              <h2 className='mt-5 max-w-lg text-4xl font-bold tracking-tight text-white sm:text-5xl'>
                Start Your First Assessment Today
              </h2>
              <div className='mt-8 flex justify-start'>
                <motion.div
                  animate={reduceMotion ? undefined : { scale: [1, 1.03, 1] }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <GreenButton href='/register'>Register Your Organisation</GreenButton>
                </motion.div>
              </div>
            </div>
            <p className='mx-auto mt-6 max-w-none text-left text-base leading-8 text-white/72 lg:max-w-sm'>
              Whether you are an environmental consultancy managing multiple EIAs, a project manager coordinating multidisciplinary teams, or an independent reviewer evaluating compliance &mdash; EnviroQuant adapts to how your team works. Register your organisation and invite your team to get started.
            </p>
          </SectionReveal>
        </GlowingCard>
      </section>
    </SiteShell>
  )
}

const aboutPillars = [
  {
    title: 'Evidence-First Assessment',
    description:
      'Every finding, compliance judgement, and recommendation is grounded in traceable evidence. No conclusion stands without a verifiable basis from source documents.'
  },
  {
    title: 'AI Assists, Humans Decide',
    description:
      'Our AI evaluates compliance and surfaces gaps, but domain experts make every decision. Technology augments human judgement — it never replaces it.'
  },
  {
    title: 'Transparency & Traceability',
    description:
      'From source document to final assessment, every piece of content maintains a clear audit trail. Regulators and stakeholders can verify the basis for every statement.'
  }
]

const servicesPrimaryCards = [
  {
    title: 'Structured EIA Builder',
    description:
      'Build complete EIAs using an 8-section checklist framework with 43+ subsections mapped to South African regulatory requirements.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(237,255,252,0.96),rgba(191,255,247,0.82))]'
  },
  {
    title: 'Multi-Team Collaboration',
    description:
      'Assign sections to domain specialists, track progress, manage due dates, and coordinate reviews across your entire team.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(245,255,250,0.96),rgba(216,255,227,0.82))]'
  },
  {
    title: 'AI Compliance Review',
    description:
      'Run AI-powered evaluations against regulatory checklists. Get severity-rated findings with evidence citations and remediation tracking.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(241,252,255,0.96),rgba(196,242,255,0.82))]'
  }
]

const servicesSecondaryCards = [
  {
    title: 'Source Document Intelligence',
    description:
      'Upload evidence documents. AI extracts content chunks for direct source-to-subsection mapping, ensuring full traceability.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(245,255,248,0.96),rgba(219,255,228,0.8))]'
  },
  {
    title: 'Review Workflow & Export',
    description:
      'A controlled 7-state review workflow with approval gates. Export completed assessments as PDF, DOCX, or JSON for submission.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(250,255,245,0.96),rgba(231,255,193,0.82))]'
  }
]

function ServiceFeatureCard ({
  title,
  description,
  mediaClassName,
  className = '',
  titleClassName = '',
  descriptionClassName = ''
}: Readonly<{
  title: string
  description: string
  mediaClassName: string
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}>) {
  return (
    <GlowingCard
      intensity='strong'
      className={`h-full  p-5 sm:p-8 border-0 text-center bg-transparent glowing-border ${className}`}
    >
      <div className={`h-48 rounded-[1rem]  shadow-[0_18px_48px_rgba(0,0,0,0.22)] sm:h-60 ${mediaClassName}`}>

      </div>
      <h3
        className={`mt-6 text-[1.65rem] font-semibold leading-tight text-white ${titleClassName}`}
      >
        {title}
      </h3>
      <p
        className={`mt-4 text-sm leading-7 text-white/72 sm:text-lg ${descriptionClassName}`}
      >
        {description}
      </p>
    </GlowingCard>
  )
}

function ContactField ({
  label,
  children
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className='block'>
      <span className='mb-3 block text-[1.1rem] font-medium text-white/92'>
        {label}
      </span>
      {children}
    </label>
  )
}

export function AboutMarketingPage () {
  const reduceMotion = useReducedMotion()

  return (
    <SiteShell>
      <section className='relative min-h-screen h-auto bg-[rgba(8,28,21,0.5)] px-5 pb-12 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pb-8'>
        <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.2fr_0.9fr] '>
          <SectionReveal from='left'>
            <div className='max-w-sm pt-6'>
              <h1 className='text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:leading-[0.98]'>
                The Future of Environmental Assessment
              </h1>
              <p className='mt-7 text-lg font-medium text-white/72 sm:text-xl'>
                EnviroQuant began with a simple question: What if the EIA process
                could be as rigorous and transparent as the science it is meant
                to uphold? That question became a platform.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='scale'>
            <div className='relative mx-auto flex min-h-[20rem] w-full items-center justify-center sm:min-h-[34rem] lg:min-h-[40rem]'>
              <motion.div
                className='absolute inset-x-[18%] top-[16%] h-[58%] '
                animate={
                  reduceMotion
                    ? undefined
                    : { opacity: [0.3, 0.62, 0.3], scale: [1, 1.05, 1] }
                }
                transition={{
                  duration: 7.2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -12, 0] }}
                transition={{
                  duration: 8.4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className='relative z-1'
              >
                <Image
                  src='/images/green-world.png'
                  alt='Wireframe earth with a growing plant'
                  width={900}
                  height={1024}
                  className='h-auto w-full max-w-[24rem] object-cover sm:max-w-[32rem] lg:max-w-full'
                />
              </motion.div>
            </div>
          </SectionReveal>

          <SectionReveal from='right' className='mb-0 mt-0 lg:mb-28 lg:mt-auto'>
            <div className='max-w-sm pt-4 text-left lg:ml-auto lg:pt-28 lg:text-right'>
              <h2 className='text-4xl font-semibold tracking-tight text-white sm:text-5xl'>
                Built for Rigour and Transparency
              </h2>
              <p className='mt-7 text-lg font-medium text-white/72 sm:text-xl lg:text-right'>
                EIA processes have long relied on fragmented tools and manual
                coordination. We saw the compliance gaps, the lost evidence trails,
                and the months-long review cycles — and built a better way.
              </p>
            </div>
          </SectionReveal>
        </div>
        <div className='mx-auto z-10 mt-8 max-w-5xl lg:-translate-y-20'>
          <SectionReveal from='up'>
            <GlowingCard
              intensity='strong'
              className='z-10 px-6 py-8 text-center sm:px-12 sm:py-12'
            >
              <h2 className='text-3xl font-semibold tracking-tight text-white sm:text-[2.8rem]'>
                A Platform for Multidisciplinary Teams
              </h2>
              <p className='mx-auto mt-7 max-w-5xl text-base leading-8 text-white/78 sm:text-[1.44rem] sm:leading-[1.45]'>
                We are environmental scientists, engineers, compliance specialists,
                and technologists united by one belief: that every environmental
                decision deserves to be grounded in verifiable evidence.
                EnviroQuant brings these disciplines together in a single
                collaborative platform.
              </p>
            </GlowingCard>
          </SectionReveal>
        </div>
      </section>

      <section className='border-custom border-up-down px-5 py-14 sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-7xl'>
          <div className='grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start'>
            <SectionReveal from='left'>
              <h2 className='max-w-md text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:leading-[1.02]'>
                The Pillars of Our Approach
              </h2>
            </SectionReveal>
            <SectionReveal from='right'>
              <p className='max-w-4xl text-lg leading-8 text-white/76 sm:text-xl sm:leading-9'>
                Our philosophy is not a marketing statement. It is the design
                principle behind every feature we build. It ensures that the platform
                serves the integrity of the assessment process, not just its speed.
              </p>
            </SectionReveal>
          </div>

          <div className='mt-14 grid gap-16 lg:grid-cols-3 w-full'>
            {aboutPillars.map((pillar, index) => (
              <SectionReveal key={pillar.title} from='up' delay={index * 0.08}>
                <GlowingCard
                  intensity='strong'
                  className='h-full bg-transparent backdrop-blur-xl border-0 glowing-border  px-8 py-10 text-center sm:min-h-[26.25rem]'

                >
                  <h3 className='mt-5 text-3xl font-semibold leading-[1.08] text-white sm:text-[2.25rem]'>
                    {pillar.title}
                  </h3>
                  <p className='mt-6 text-lg leading-8 text-white/72 sm:text-xl'>
                    {pillar.description}
                  </p>
                </GlowingCard>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      <section className='px-5 pb-24 pt-12 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[40%_1fr] lg:items-center'>
          <SectionReveal from='left'>
            <div className='relative overflow-hidden rounded-[0.6rem] border border-white/10 bg-[rgba(255,255,255,0.06)] shadow-[0_18px_64px_rgba(0,0,0,0.22)]'>
              <motion.div
                className='absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(0,245,212,0.2),transparent_55%)]'
                animate={
                  reduceMotion ? undefined : { opacity: [0.28, 0.5, 0.28] }
                }
                transition={{
                  duration: 6.4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <Image
                src='/images/leaf.png'
                alt='Regenerative leaf network artwork'
                width={300}
                height={400}
                className='h-[20rem] w-full object-contain'
              />
            </div>
          </SectionReveal>

          <SectionReveal from='right'>
            <div className='max-w-2xl'>
              <h2 className='text-3xl font-semibold tracking-tight text-white sm:text-[2.8rem] sm:leading-[1.04]'>
                Toward an Environmental Intelligence Operating System
              </h2>
              <p className='mt-7 text-lg leading-8 text-white/76 sm:text-2xl sm:leading-9'>
                EnviroQuant is the first step toward a comprehensive Environmental
                Intelligence Operating System&trade;. We are building the foundation
                for predictive environmental analytics, continuous monitoring
                integration, and cross-project regulatory intelligence. The EIA
                platform is where that journey begins.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>
    </SiteShell>
  )
}

export function ServicesMarketingPage () {
  const reduceMotion = useReducedMotion()

  return (
    <SiteShell>
      <section className='relative isolate overflow-hidden px-5 pb-8 pt-24 sm:px-8 sm:pt-28 lg:px-12 lg:pt-12'>
        <div className='mx-auto relative isolate flex max-w-7xl flex-col items-start justify-center gap-8 lg:min-h-[32rem] lg:gap-10'>
          <SectionReveal from='left' className='relative z-10'>
            <div className='max-w-3xl pt-0 lg:pt-10'>
              <h1 className='max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.02]'>
                EIA Intelligence for Every Team
              </h1>
              <p className='mt-8 max-w-3xl text-xl leading-[1.3] text-white/76 sm:text-[1.75rem] sm:leading-[1.22]'>
                EnviroQuant does not just digitise paperwork. It transforms how
                EIA teams collaborate, review, and deliver — with AI-powered
                compliance checking at every step.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='right' className='relative w-full lg:absolute lg:-right-[47%]'>

              <motion.div

                animate={
                  reduceMotion
                    ? undefined
                    : { opacity: [0.28, 0.56, 0.28], scale: [1, 1.08, 1] }
                }
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}

              />
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{
                  duration: 8.2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className=''
              >
                <Image
                  src='/images/inovation.png'
                  alt='Abstract innovation globe'
                 width={1400}
                 height={1400}
                  className='mx-auto h-auto w-full max-w-[26rem] object-cover sm:max-w-[34rem] lg:max-w-full lg:translate-y-[10%]'
                />
              </motion.div>

          </SectionReveal>
        </div>
      </section>

      <section className='border-custom border-up-down glassmorphism px-5 py-16 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-8 lg:grid-cols-[30%_1fr] lg:items-start'>
          <SectionReveal from='left'>
            <h2 className='max-w-md text-3xl font-medium tracking-tight text-white sm:text-[3.3225rem] sm:leading-[1.02]'>
              An Integrated EIA Platform
            </h2>
          </SectionReveal>

          <SectionReveal from='right'>
            <p className='max-w-5xl text-lg leading-8 text-white/76 sm:text-[1.65rem] sm:leading-[1.22]'>
              Our capabilities are not isolated tools. They form an interconnected
              platform where document intelligence feeds into structured authoring,
              collaborative workflows drive review cycles, and AI evaluation
              ensures nothing falls through the cracks.
            </p>
          </SectionReveal>
        </div>
      </section>

      <section className='px-5 py-14 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1fr_0.82fr] '>
          {servicesPrimaryCards.map((card, index) => (
            <SectionReveal
              key={card.title}
              from={index === 1 ? 'up' : index === 0 ? 'left' : 'right'}
              delay={index * 0.08}
            >
              <ServiceFeatureCard
                title={card.title}
                description={card.description}
                mediaClassName={card.mediaClassName}
                className={index === 1 ? 'sm:px-7 sm:py-7 lg:mt-6' : ''}
                titleClassName={index === 1 ? 'text-[2.55rem] text-center' : ''}
                descriptionClassName={
                  index === 1 ? 'text-center text-base sm:text-lg' : ''
                }
              />
            </SectionReveal>
          ))}


        </div>
        <div className='mx-auto mt-16 grid max-w-7xl gap-8 lg:mt-24 lg:min-h-[40rem] lg:grid-cols-[1fr_0.9fr_0.8fr]'>
          <SectionReveal from='left' >
            <div className='flex h-full flex-col justify-start pt-6 lg:pr-6'>
              <h2 className='max-w-sm text-3xl font-medium tracking-tight text-white sm:text-[2.94rem] sm:leading-[1.02]'>
                Compliance Intelligence
              </h2>
              <p className='mt-6 max-w-md text-lg leading-8 text-white/74 sm:text-[1.7rem] sm:leading-[1.2]'>
                True compliance is not a checkbox exercise. Our AI evaluates EIA
                content against regulatory requirements, surfaces gaps with
                evidence citations, and tracks remediation across review cycles.
              </p>
            </div>
          </SectionReveal>

          {servicesSecondaryCards.map((card, index) => (
            <SectionReveal
              key={card.title}
              from={index === 0 ? 'up' : 'right'}
              delay={0.14 + index * 0.08}
              className={`h-auto ${index === 0 ? 'lg:mt-auto' : 'lg:mb-auto'}`}
            >
              <ServiceFeatureCard
                title={card.title}
                description={card.description}
                className='h-auto'

                mediaClassName={card.mediaClassName}
              />
            </SectionReveal>
          ))}
        </div>
      </section>

      <section className='px-5 pb-24 pt-12 text-center sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-5xl'>
          <SectionReveal from='up'>
            <h2 className='text-3xl font-medium tracking-tight text-white sm:text-[3.4rem]'>
              From Assessment to Intelligence
            </h2>
            <p className='mx-auto mt-10 max-w-4xl text-lg leading-8 text-white/74 sm:mt-16 sm:text-[1.7rem] sm:leading-[1.26]'>
              EnviroQuant is more than a document builder. It is an intelligence
              platform that learns from every assessment, tracks regulatory
              evolution, and helps your team deliver better outcomes faster. When
              combined, our capabilities form a complete EIA lifecycle solution
              from evidence collection to regulatory submission.
            </p>
            <div className='mt-10 flex justify-center'>
              <motion.div
                animate={reduceMotion ? undefined : { scale: [1, 1.03, 1] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <GreenButton href='/register' >
                  Start Your First EIA
                </GreenButton>
              </motion.div>
            </div>
          </SectionReveal>
        </div>
      </section>
    </SiteShell>
  )
}

export function ContactMarketingPage () {
  const reduceMotion = useReducedMotion()
  const [submitted, setSubmitted] = useState(false)

  return (
    <SiteShell>
      <section className='px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pt-24'>
        <div className='mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.94fr_1.06fr] lg:items-start'>
          <SectionReveal from='left' className='h-full'>
            <div className='flex h-full max-w-2xl flex-1 flex-col justify-between pt-0 lg:pt-10'>
              <div >
                <h1 className='max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-[3.2rem] lg:leading-[1.05]'>
                  Book a Demo or Get in Touch
                </h1>
                <p className='mt-8 max-w-2xl text-lg leading-8 text-white/76 sm:text-[1.3rem] sm:leading-[1.24]'>
                  Whether you are an environmental consultancy looking to streamline
                  your EIA process, a regulator seeking better transparency, or an
                  organisation managing compliance across multiple projects &mdash;
                  we would love to show you what EnviroQuant can do.
                </p>
              </div>

              <p className='mt-10 max-w-3xl text-xl font-semibold leading-[1.28] text-white sm:text-[1.75rem] sm:leading-[1.18] lg:mb-20'>
                We are not looking for users. We are looking for partners who
                believe environmental assessment should be evidence-led,
                transparent, and collaborative. Let&apos;s talk.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='right'>
            <div className='pt-0 lg:pl-6 lg:pt-8'>
              {submitted ? (
                <div className='rounded-2xl border border-[#77A63C]/40 bg-[rgba(119,166,60,0.1)] p-8 text-center'>
                  <h2 className='text-2xl font-semibold text-white'>Thank you!</h2>
                  <p className='mt-4 text-lg text-white/74'>
                    We have received your message and will get back to you shortly.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className='text-2xl font-medium tracking-tight text-white sm:text-[1.9rem]'>
                    Get Started
                  </h2>
                  <p className='mt-5 max-w-2xl text-lg leading-8 text-white/74 sm:text-[1.3rem] sm:leading-[1.28]'>
                    Tell us about your team and EIA needs, and we will arrange a
                    personalised walkthrough of the platform.
                  </p>

                  <form className='mt-10 space-y-6 sm:mt-12' onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
                    <ContactField label='Full Name'>
                      <Input
                        required
                        aria-label='Full Name'
                        className='h-14 rounded-2xl border-[#77A63C] bg-transparent text-lg text-white placeholder:text-white/28 focus-visible:ring-[#77A63C]'
                      />
                    </ContactField>

                    <ContactField label='Your Email'>
                      <Input
                        required
                        aria-label='Your Email'
                        type='email'
                        className='h-14 rounded-2xl border-[#77A63C] bg-transparent text-lg text-white placeholder:text-white/28 focus-visible:ring-[#77A63C]'
                      />
                    </ContactField>

                    <ContactField label='Phone Number'>
                      <Input
                        aria-label='Phone Number'
                        type='tel'
                        className='h-14 rounded-2xl border-[#77A63C] bg-transparent text-lg text-white placeholder:text-white/28 focus-visible:ring-[#77A63C]'
                      />
                    </ContactField>

                    <ContactField label='How can we help?'>
                      <Textarea
                        required
                        aria-label='How can we help?'
                        className='min-h-40 rounded-[1.6rem] border-[#77A63C] bg-transparent text-lg text-white placeholder:text-white/28 focus-visible:ring-[#77A63C]'
                      />
                    </ContactField>

                    <div className='flex justify-stretch pt-2 sm:justify-end'>
                      <motion.div
                        className='w-full sm:w-auto'
                        animate={reduceMotion ? undefined : { scale: [1, 1.02, 1] }}
                        transition={{
                          duration: 3.1,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        <Button type='submit' className='h-14 w-full rounded-2xl bg-[#8AB83E] px-10 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#99C847] hover:shadow-[0_0_26px_rgba(0,245,212,0.3)] sm:w-auto'>
                          Send a Message
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </>
              )}
            </div>
          </SectionReveal>
        </div>
      </section>
    </SiteShell>
  )
}

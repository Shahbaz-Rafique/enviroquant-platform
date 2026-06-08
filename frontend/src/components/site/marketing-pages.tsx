'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import type { ReactNode } from 'react'

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
                   We Don’t Just Build Technology. We Cultivate a New World.
                  </h2>
                  <p className='mt-6 text-lg leading-8 text-white/74 sm:text-2xl'>
                   The future is not a destination—it’s a design. Every step forward is a choice: will we build walls between us and nature, or bridges that bring us closer?
                  </p>
                </div>
                <div className='mt-8 flex w-full flex-wrap justify-end gap-4'>
                  <GreenButton href='#philosophy' outline>
                    Our Philosophy
                  </GreenButton>
                  <GreenButton href='/contact'>Join the Movement</GreenButton>
                </div>
              </GlowingCard>
            </motion.div>
          </div>

          <GlowingCard className='mt-8 flex max-h-none p-0 !overflow-visible lg:max-h-[28rem]'>
            {' '}
            {/* Removed padding from className */}
            <div className='p-6 sm:p-12 lg:p-20 lg:py-32'>
              <SectionHeading title='A World Out of Balance' />
              <p className='mt-8 max-w-xl text-lg font-normal text-white/74 sm:text-xl'>
               For centuries, we’ve chased progress as if nature was an obstacle to overcome. Forests became resources, rivers became waste channels, and cities grew into machines that suffocate the very life they depend on. This separation has left us with more technology than ever—yet less harmony than before.
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
              title: 'Restoring Harmony',
              text: 'We believe innovation should be an act of restoration, not destruction. Imagine buildings that clean the air instead of polluting it, systems that recycle water endlessly, and technology that grows like living organisms. Our vision is a future where progress no longer extracts from the planet, but gives back to it.'
            },
            {
              title: 'More Than Efficiency',
              text: 'Efficiency alone is not enough. A faster machine or a cheaper process means nothing if it leaves the world emptier. Our philosophy is to design technology that exists in balance—solutions that heal ecosystems while supporting human life. This is how we measure progress: by how much life we nurture, not how much we consume.'
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

      <section className='mt-14 w-full px-5 py-16 sm:mt-20 sm:px-8 sm:py-20 lg:px-12'>
        <div className='relative mx-auto flex h-auto flex-col items-center'>
          <SectionReveal from='up'>
            <SectionHeading
              title='What We Create'
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
                title: 'Walls That Grow',
                description:
                  'Vertical structures that transform into forests, purifying air and creating habitats for wildlife'
              },
              {
                title: 'Materials That Adapt',
                description:
                  'Intelligent surfaces that respond to light, heat, and seasons—minimizing energy use naturally.'
              },
              {
                title: 'Design With Purpose',
                description:
                  'Every project serves as a reminder that technology can feel alive, not mechanical.'
              },
              {
                title: 'Water That Sustain',
                description:
                  'Closed-loop systems that recycle and nourish, turning buildings into self-sustaining ecosystems.'
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
                Be Part of the Great Restoration
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
                  <GreenButton href='/contact'>Join the Movement</GreenButton>
                </motion.div>
              </div>
            </div>
            <p className='mx-auto mt-6 max-w-none text-left text-base leading-8 text-white/72 lg:max-w-sm'>
             This is not just about us—it’s about all of us. We invite dreamers, builders, investors, and visionaries to take part in shaping a future where humanity and nature thrive together. The restoration begins with a choice, and that choice can start with you.
            </p>
          </SectionReveal>
        </GlowingCard>
      </section>
    </SiteShell>
  )
}

const aboutPillars = [
  {
    title: 'Symbiosis Over Efficiency',
    description:
      'We do not design for speed or cost alone. We design for balance so every system gives something back to the environment it enters.'
  },
  {
    title: 'Creation Over Extraction',
    description:
      'Our work is measured by what it restores: cleaner air, healthier water, stronger habitats, and more resilient communities.'
  },
  {
    title: 'Stewardship Over Scale',
    description:
      'Growth matters only when it deepens care. We build solutions that can expand without losing their ecological intelligence.'
  }
]

const servicesPrimaryCards = [
  {
    title: 'Smart Water System',
    description:
      'Closed-loop systems that recycle rainwater into nourishment for self-sustaining gardens.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(237,255,252,0.96),rgba(191,255,247,0.82))]'
  },
  {
    title: 'Living Walls & Urban Lungs',
    description:
      'Towering vertical gardens that purify the air, dampen noise, and shelter local wildlife.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(245,255,250,0.96),rgba(216,255,227,0.82))]'
  },
  {
    title: 'Adaptive Water Grids',
    description:
      'Distributed capture and reuse systems that respond to weather, building demand, and public space needs.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(241,252,255,0.96),rgba(196,242,255,0.82))]'
  }
]

const servicesSecondaryCards = [
  {
    title: 'Soil & Water Remediation',
    description:
      'Harnessing microbes and sensors to heal poisoned lands and bring purity back to rivers.',
    mediaClassName:
      'bg-[linear-gradient(135deg,rgba(245,255,248,0.96),rgba(219,255,228,0.8))]'
  },
  {
    title: 'Micro-Forest Projects',
    description:
      "Planting fast-growing urban forests that restore biodiversity and filter the city's air within years, not decades.",
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
                The Genesis of a Movement
              </h1>
              <p className='mt-7 text-lg font-medium text-white/72 sm:text-xl'>
                We did not begin as a company chasing markets. We began as a
                group of restless minds who asked: What if progress could heal
                instead of harm? That question became a movement.
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
                Born from a Silent Crisis
              </h2>
              <p className='mt-7 text-lg font-medium text-white/72 sm:text-xl lg:text-right'>
                We witnessed the grey spread of concrete, the vanishing of
                green, and the quiet loss of life beneath the noise of progress.
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
                A Collective of Dreamers & Doers
              </h2>
              <p className='mx-auto mt-7 max-w-5xl text-base leading-8 text-white/78 sm:text-[1.44rem] sm:leading-[1.45]'>
                We are bio-engineers, artists, architects, and rebels united by
                one belief: creation is more powerful than destruction.
                Together, we design systems that do not dominate nature but live
                in rhythm with it. Our diversity is our strength because the
                future demands many voices, not one.
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
                The Pillars of Our Purpose
              </h2>
            </SectionReveal>
            <SectionReveal from='right'>
              <p className='max-w-4xl text-lg leading-8 text-white/76 sm:text-xl sm:leading-9'>
                Our manifesto is not a statement on paper. It is a living guide
                for everything we build. It reminds us that true progress is
                measured not by efficiency or profit, but by harmony. These are
                the roots of our purpose.
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
                A New Way of Creating
              </h2>
              <p className='mt-7 text-lg leading-8 text-white/76 sm:text-2xl sm:leading-9'>
                This movement is not about disruption. It is about restoration.
                We are here to prove that technology can be more than machinery.
                It can be a living bridge back to the earth. And this is only
                the beginning.
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
                Curating a Living Future
              </h1>
              <p className='mt-8 max-w-3xl text-xl leading-[1.3] text-white/76 sm:text-[1.75rem] sm:leading-[1.22]'>
                We do not just offer services. We create pathways into a
                different kind of world. Every project is more than a solution;
                it is a seed for renewal.
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
              Innovation as an Ecosystem
            </h2>
          </SectionReveal>

          <SectionReveal from='right'>
            <p className='max-w-5xl text-lg leading-8 text-white/76 sm:text-[1.65rem] sm:leading-[1.22]'>
              Technology should not stand apart from life. It should flow within
              it. That is why our services are not isolated offerings, but
              interconnected designs. Together, they form ecosystems that grow,
              adapt, and restore.
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
                Regenerative Technology
              </h2>
              <p className='mt-6 max-w-md text-lg leading-8 text-white/74 sm:text-[1.7rem] sm:leading-[1.2]'>
                True progress does not just do less harm. It gives more back.
                Our technologies are designed to actively restore damaged
                ecosystems and nurture life where it is fading.
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
              From Services to Stewardship
            </h2>
            <p className='mx-auto mt-10 max-w-4xl text-lg leading-8 text-white/74 sm:mt-16 sm:text-[1.7rem] sm:leading-[1.26]'>
              What we create is more than service. It is stewardship. Each
              solution is a promise that technology can serve as a guardian, not
              a destroyer. When combined, our pillars form a living framework
              that makes cities healthier, ecosystems stronger, and humanity
              more connected to the earth.
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
                <GreenButton href='/contact' >
                  Let&apos;s Build Tomorrow, Today
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

  return (
    <SiteShell>
      <section className='px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:px-12 lg:pt-24'>
        <div className='mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.94fr_1.06fr] lg:items-start'>
          <SectionReveal from='left' className='h-full'>
            <div className='flex h-full max-w-2xl flex-1 flex-col justify-between pt-0 lg:pt-10'>
              <div >
                <h1 className='max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-[3.2rem] lg:leading-[1.05]'>
                  Join Us in the Great Restoration
                </h1>
                <p className='mt-8 max-w-2xl text-lg leading-8 text-white/76 sm:text-[1.3rem] sm:leading-[1.24]'>
                  This is not just business. It is a movement. A call to reimagine
                  what progress can mean, and to rebuild our bond with the earth.
                  Whether you are a visionary, an innovator, or simply someone who
                  believes in change, your role matters here.
                </p>
              </div>

              <p className='mt-10 max-w-3xl text-xl font-semibold leading-[1.28] text-white sm:text-[1.75rem] sm:leading-[1.18] lg:mb-20'>
                We are not looking for clients. We are looking for allies. If
                you feel the pull to create differently, to heal, to restore, to
                cultivate, then you have already taken the first step.
                Let&apos;s take the next one, together.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='right'>
            <div className='pt-0 lg:pl-6 lg:pt-8'>
              <h2 className='text-2xl font-medium tracking-tight text-white sm:text-[1.9rem]'>
                Begin Your Journey
              </h2>
              <p className='mt-5 max-w-2xl text-lg leading-8 text-white/74 sm:text-[1.3rem] sm:leading-[1.28]'>
                The restoration of our planet begins with small choices.
                Reaching out is one of them. Share your vision, and let&apos;s
                explore how we can bring it to life.
              </p>

              <form className='mt-10 space-y-6 sm:mt-12'>
                <ContactField label='Full Name'>
                  <Input
                    aria-label='Full Name'
                    className='h-14 rounded-2xl border-[#77A63C] bg-transparent text-lg text-white placeholder:text-white/28 focus-visible:ring-[#77A63C]'
                  />
                </ContactField>

                <ContactField label='Your Email'>
                  <Input
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

                <ContactField label='How We can Help?'>
                  <Textarea
                    aria-label='How We can Help?'
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
                    <Button className='h-14 w-full rounded-2xl bg-[#8AB83E] px-10 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#99C847] hover:shadow-[0_0_26px_rgba(0,245,212,0.3)] sm:w-auto'>
                      Send a Message
                    </Button>
                  </motion.div>
                </div>
              </form>
            </div>
          </SectionReveal>
        </div>
      </section>
    </SiteShell>
  )
}

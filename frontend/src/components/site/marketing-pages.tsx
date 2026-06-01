'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { AnimatedGlobe } from '@/components/site/animated-globe'
import { GlowingCard } from '@/components/site/glowing-card'
import { SectionReveal } from '@/components/site/section-reveal'
import { ServiceCarousel } from '@/components/site/service-carousel'
import { SiteShell } from '@/components/site/site-shell'
import { WireframeLeafNetwork } from '@/components/site/wireframe-leaf-network'
import { WireframePlant } from '@/components/site/wireframe-plant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'

function GreenButton ({
  href,
  children,
  outline = false
}: Readonly<{ href: string; children: string; outline?: boolean }>) {
  return (
    <Button
      asChild
      className='h-12 rounded-2xl px-6 text-lg font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(0,245,212,0.3)]'
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
        <p className='mb-3 text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
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
        className=' absolute left-0 top-0'
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
      <section className='relative min-h-full  px-5 pb-16 sm:px-8 lg:px-12'>
        <HomeHeroBackdrop />
        <div className='mx-auto grid min-h-screen items-center gap-10 max-w-7xl'>
          <div className='relative min-h-[42rem] w-full lg:min-h-[50rem] max-w-5xl ml-auto text-right'>
            <motion.div
              className='absolute right-0 z-20 top-44 w-full '
              animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={{
                duration: 8.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <GlowingCard
                intensity='strong'
                className='min-h-[32rem] w-full p-8 flex flex-col items-end sm:p-10 text-right'
              >
                <div className='max-w-2xl'>
                  <h2 className='mt-5 text-4xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.45rem] lg:leading-[1.02]'>
                    We Don’t Just Build Technology. We Cultivate a New World.
                  </h2>
                  <p className='mt-6  text-2xl leading-8 text-white/74'>
                    The future is not a destination—it’s a design. Every step
                    forward is a choice: will we build walls between us and
                    nature, or bridges that bring us closer?
                  </p>
                </div>
                <div className='mt-8 flex flex-wrap gap-4'>
                  <GreenButton href='#philosophy' outline>
                    Our Philosophy
                  </GreenButton>
                  <GreenButton href='/contact'>Join the Movement</GreenButton>
                </div>
              </GlowingCard>
            </motion.div>
          </div>

          <GlowingCard className='p-0 mt-8 !overflow-visible max-h-[28rem] flex'>
            {' '}
            {/* Removed padding from className */}
            <div className='p-8 sm:p-12 lg:p-20 lg:py-32'>
              <SectionHeading title='A World Out of Balance' />
              <p className='mt-8 max-w-xl text-xl font-normal  text-white/74'>
                The systems that shape our cities, our water, and our daily
                rituals have been optimized for speed, not harmony. We see that
                imbalance as an invitation to design with deeper intelligence.
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

      <section className='relative mt-32 px-5 py-10 sm:px-8 lg:px-12 isolate'>
        <Image
          src='/images/left-hand.png'
          alt='Left Hand'
          width={500}
          height={500}
          //priority
          className='absolute left-0 -top-full z-10 '
        />
        <Image
          src='/images/right-hand.png'
          alt='Right Hand'
          width={500}
          height={500}
          //priority
          className='absolute -right-10  z-1 '
        />
        <div className='mx-auto relative grid max-w-7xl gap-6 lg:grid-cols-2'>
          {[
            {
              title: 'Restoring Harmony',
              text: 'We design systems that reconnect people with place, balancing utility with ecological intelligence so every intervention contributes to regeneration.'
            },
            {
              title: 'More Than Efficiency',
              text: 'Performance matters, but the real benchmark is whether the work improves the living context around it—water, soil, light, and community.'
            }
          ].map((card, index) => (
            <SectionReveal
              key={card.title}
              from={index === 0 ? 'left' : 'right'}
              delay={index * 0.08}
            >
              <GlowingCard
                intensity='strong'
                className='min-h-[20rem]  p-8 sm:p-10'
              >
                <div className='flex h-full flex-col justify-between items-center text-center'>
                  <div>
                    <h3 className='mt-4 text-4xl font-medium text-white'>
                      {card.title}
                    </h3>
                    <p className='mt-5 max-w-lg text-lg leading-8 text-white/72'>
                      {card.text}
                    </p>
                  </div>
                </div>
              </GlowingCard>
            </SectionReveal>
          ))}
        </div>
      </section>

      <section className='px-5 py-20 w-full sm:px-8 lg:px-12 mt-20'>
        <div className='mx-auto flex flex-col items-center  relative'>
          <SectionReveal from='up'>
            <SectionHeading
              title='What We Create'
              titleClassName='text-center  font-bold text-5xl'
            />
          </SectionReveal>
          <Image
            src='/images/leaf.png'
            alt='Leaf'
            fill
            //priority
            className='absolute object-cover translate-y-32'
          />
          <div className='relative mt-14 h-gull w-full min-h-[44rem] isolate gap-6 '>
            {[
              {
                title: 'Walls That Grow',
                description:
                  'Systems that soften the boundary between architecture and ecosystem, allowing form to support living function.'
              },
              {
                title: 'Materials That Adapt',
                description:
                  'Responsive surfaces and assemblies that change with climate, use, and the needs of the environment.'
              },
              {
                title: 'Design With Purpose',
                description:
                  'Every line, material, and interface carries intention, translating stewardship into visible form.'
              },
              {
                title: 'Water That Sustain',
                description:
                  'Infrastructure that honors water as a living system, not just a utility, protecting the cycles that sustain life.'
              }
            ].map((card, index) => {
              const positions = [
                'top-5 left-0',
                'top-0 right-0',
                'bottom-20 left-0',
                'bottom-0 right-0'
              ]
              return (
                <SectionReveal
                  key={card.title}
                  from={index % 2 === 0 ? 'left' : 'right'}
                  delay={index * 0.08}
                  className={`absolute w-fit ${positions[index]}`}
                >
                  <GlowingCard
                    intensity='strong'
                    className='relative z-10  px-8 '
                  >
                    <h3 className='mt-4 text-3xl font-medium text-white'>
                      {card.title}
                    </h3>
                    <p className='mt-4 max-w-sm text-sm leading-7 text-white/72'>
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
        <GlowingCard className='mx-auto max-w-5xl py-8'>
          <SectionReveal from='scale' className="grid grid-cols-2 gap-8">
           
            <div>
                <h2 className='mt-5 text-5xl font-bold tracking-tight text-white max-w-lg'>
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
            <p className='mx-auto mt-6 max-w-sm text-left text-base leading-8 text-white/72'>
             This is not just about us—it’s about all of us. We invite dreamers, builders, investors, and visionaries to take part in shaping a future where humanity and nature thrive together. The restoration begins with a choice, and that choice can start with you.
            </p>
           
          </SectionReveal>
        </GlowingCard>
      </section>
    </SiteShell>
  )
}

export function AboutMarketingPage () {
  const reduceMotion = useReducedMotion()

  return (
    <SiteShell>
      <section className='relative px-5 py-14 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.1fr_0.82fr] lg:items-center'>
          <SectionReveal from='left'>
            <div>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                About
              </p>
              <h1 className='max-w-md text-5xl font-semibold tracking-tight text-white sm:text-6xl'>
                The Genesis of a Movement
              </h1>
              <p className='mt-6 max-w-sm text-base leading-8 text-white/72'>
                We didn’t begin as a company chasing markets. We began as a
                group of restless minds who asked what if progress could heal
                instead of harm.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='scale'>
            <div className='relative mx-auto flex min-h-[36rem] items-center justify-center'>
              <motion.div
                className='absolute inset-0 rounded-full bg-[#00F5D4]/10 blur-[130px]'
                animate={
                  reduceMotion ? undefined : { opacity: [0.35, 0.72, 0.35] }
                }
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <AnimatedGlobe
                variant='plant'
                className='relative z-10 w-full max-w-[31rem] drop-shadow-[0_0_44px_rgba(103,232,249,0.26)]'
              />
            </div>
          </SectionReveal>

          <SectionReveal from='right'>
            <div className='max-w-md text-right lg:ml-auto'>
              <p className='text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                Born from a Silent Crisis
              </p>
              <p className='mt-5 text-base leading-8 text-white/72'>
                We witnessed the grey spread of concrete, the vanishing of
                green, and the quiet loss of life beneath the noise of progress.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className='px-5 py-10 sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-7xl'>
          <GlowingCard
            intensity='strong'
            className='bg-[rgba(4,17,14,0.82)] p-8 sm:p-12'
          >
            <SectionReveal from='up'>
              <p className='text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                A Collective of Dreamers & Doers
              </p>
              <p className='mt-6 max-w-4xl text-lg leading-9 text-white/78'>
                We are bio-engineers, artists, architects, and rebels united by
                one belief: creation is more powerful than destruction.
                Together, we design systems that don’t dominate nature but live
                in rhythm with it.
              </p>
            </SectionReveal>
          </GlowingCard>
        </div>
      </section>

      <section className='px-5 py-16 sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-7xl'>
          <SectionReveal from='up'>
            <SectionHeading
              eyebrow='Purpose'
              title='The Pillars of Our Purpose'
            />
          </SectionReveal>
          <div className='mt-6 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start'>
            <SectionReveal from='left'>
              <p className='max-w-sm text-base leading-8 text-white/72'>
                Our manifesto is not a statement on paper. It is a living guide
                for everything we build. These are the roots of our purpose.
              </p>
            </SectionReveal>
            <SectionReveal from='right'>
              <p className='max-w-2xl text-base leading-8 text-white/72'>
                We design for balance, just as a forest thrives through giving
                and receiving. Our innovations are meant to coexist with the
                world around them, enriching rather than exploiting.
              </p>
            </SectionReveal>
          </div>
          <div className='mt-10 grid gap-6 lg:grid-cols-3'>
            {['First Principle', 'Second Principle', 'Third Principle'].map(
              (keyLabel, index) => (
                <SectionReveal key={keyLabel} from='up' delay={index * 0.08}>
                  <GlowingCard
                    intensity='strong'
                    className='h-full bg-[rgba(4,17,14,0.76)] p-7 sm:p-8'
                  >
                    <p className='text-xs font-semibold uppercase tracking-[0.34em] text-[#67E8F9]/70'>
                      Principle {index + 1}
                    </p>
                    <h3 className='mt-4 text-2xl font-semibold text-white'>
                      Symbiosis Over Efficiency
                    </h3>
                    <p className='mt-4 text-sm leading-7 text-white/72'>
                      We don’t design for speed alone. We design for balance.
                      Just as a forest thrives through giving and receiving, our
                      innovations are meant to coexist with the world around
                      them.
                    </p>
                  </GlowingCard>
                </SectionReveal>
              )
            )}
          </div>
        </div>
      </section>

      <section className='px-5 py-18 pb-24 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center'>
          <SectionReveal from='left'>
            <div className='min-h-[22rem] rounded-[2rem] border border-white/10 bg-[#D1D5DB]/18' />
          </SectionReveal>
          <SectionReveal from='right'>
            <div className='max-w-2xl'>
              <p className='text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                A New Way of Creating
              </p>
              <h2 className='mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl'>
                A New Way of Creating
              </h2>
              <p className='mt-6 text-base leading-8 text-white/72'>
                Our process is intentionally slow where it must be, fast where
                it can be, and always grounded in the idea that restoration is
                not a feature. It is the point.
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
      <section className='px-5 py-14 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center'>
          <SectionReveal from='left'>
            <div>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                Services
              </p>
              <h1 className='max-w-xl text-5xl font-semibold tracking-tight text-white sm:text-6xl'>
                Curating a Living Future
              </h1>
              <p className='mt-6 max-w-xl text-base leading-8 text-white/72'>
                We build systems, places, and interfaces that behave less like
                machines and more like ecosystems: adaptive, resilient, and
                alive.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='right'>
            <div className='relative mx-auto flex min-h-[30rem] items-center justify-center'>
              <motion.div
                className='absolute inset-0 rounded-full bg-[#67E8F9]/10 blur-[140px]'
                animate={
                  reduceMotion ? undefined : { opacity: [0.28, 0.7, 0.28] }
                }
                transition={{
                  duration: 6.8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <AnimatedGlobe className='relative z-10 w-full max-w-[28rem] drop-shadow-[0_0_42px_rgba(103,232,249,0.28)]' />
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className='px-5 py-10 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center'>
          <SectionReveal from='left'>
            <GlowingCard className='bg-[rgba(4,17,14,0.76)] p-8 sm:p-10'>
              <p className='text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                Innovation as an Ecosystem
              </p>
              <p className='mt-6 text-base leading-8 text-white/72'>
                We approach innovation as a network of relationships, not a line
                of isolated features. Each service is designed to improve the
                long-term health of the systems it touches.
              </p>
            </GlowingCard>
          </SectionReveal>

          <SectionReveal from='right'>
            <p className='max-w-2xl text-base leading-8 text-white/70'>
              Our methodology blends environmental intelligence, regenerative
              planning, and practical delivery into a unified approach that
              reduces waste, multiplies value, and strengthens the places we
              work in.
            </p>
          </SectionReveal>
        </div>
      </section>

      <section className='px-5 py-16 sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-7xl'>
          <ServiceCarousel
            items={[
              {
                title: 'Smart Water System',
                description:
                  'Water infrastructure that senses demand, reduces loss, and keeps hydrological systems responsive across urban and ecological layers.'
              },
              {
                title: 'Living Walls & Urban Lungs',
                description:
                  'A center-stage regenerative system for facades and interiors that cools, filters, and restores air quality while becoming a living visual anchor.'
              },
              {
                title: 'Smart Water System',
                description:
                  'Adaptive water strategies that coordinate capture, storage, and distribution for resilient restoration-oriented environments.'
              }
            ]}
          />
        </div>
      </section>

      <section className='px-5 py-12 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-6 lg:grid-cols-2'>
          {[
            {
              title: 'Soil & Water Remediation',
              text: 'Targeted remediation strategies that help restore contaminated soils and water systems while preparing sites for long-term renewal.'
            },
            {
              title: 'Micro-Forest Projects',
              text: 'Compact living landscapes that increase shade, biodiversity, and community value in dense and transitional urban contexts.'
            }
          ].map((card, index) => (
            <SectionReveal
              key={card.title}
              from={index === 0 ? 'left' : 'right'}
              delay={index * 0.08}
            >
              <GlowingCard className='h-full bg-[rgba(4,17,14,0.76)] p-8 sm:p-10'>
                <p className='text-xs font-semibold uppercase tracking-[0.34em] text-[#67E8F9]/70'>
                  Regenerative Technology
                </p>
                <h3 className='mt-4 text-3xl font-semibold text-white'>
                  {card.title}
                </h3>
                <p className='mt-5 max-w-lg text-base leading-8 text-white/72'>
                  {card.text}
                </p>
              </GlowingCard>
            </SectionReveal>
          ))}
        </div>
      </section>

      <section className='px-5 py-20 sm:px-8 lg:px-12'>
        <div className='mx-auto max-w-5xl rounded-[2.2rem] border border-white/10 bg-[rgba(4,17,14,0.84)] px-8 py-14 text-center shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:px-12'>
          <SectionReveal from='scale'>
            <p className='text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/72'>
              From Services to Stewardship
            </p>
            <h2 className='mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl'>
              From Services to Stewardship
            </h2>
            <div className='mt-8 flex justify-center'>
              <GreenButton href='/contact'>
                Let’s Build Tomorrow, Today
              </GreenButton>
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
      <section className='px-5 py-14 sm:px-8 lg:px-12'>
        <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-start'>
          <SectionReveal from='left'>
            <div className='max-w-2xl pt-6'>
              <p className='mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                Contact
              </p>
              <h1 className='text-5xl font-semibold tracking-tight text-white sm:text-6xl'>
                Join Us in the Great Restoration
              </h1>
              <p className='mt-7 max-w-xl text-base leading-8 text-white/74'>
                This isn’t just business. It’s a movement. A call to reimagine
                what progress can mean, and to rebuild our bond with the earth.
              </p>
              <p className='mt-20 max-w-xl text-lg font-medium leading-9 text-white/92'>
                We are not looking for clients. We are looking for allies. If
                you feel the pull to create differently, to heal, to restore, to
                cultivate, then you’ve already taken the first step.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal from='right'>
            <GlowingCard
              intensity='strong'
              className='bg-[rgba(4,17,14,0.82)] p-8 sm:p-10'
            >
              <p className='text-xs font-semibold uppercase tracking-[0.36em] text-[#67E8F9]/70'>
                Begin Your Journey
              </p>
              <p className='mt-5 max-w-md text-base leading-8 text-white/72'>
                The restoration of our planet begins with small choices.
                Reaching out is one of them. Share your vision, and let’s
                explore how we can bring it to life.
              </p>
              <form className='mt-8 space-y-4'>
                <Input
                  placeholder='Full Name'
                  className='h-12 rounded-xl border-[#A3E635]/55 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-[#A3E635]'
                />
                <Input
                  placeholder='Your Email'
                  type='email'
                  className='h-12 rounded-xl border-[#A3E635]/55 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-[#A3E635]'
                />
                <Input
                  placeholder='Phone Number'
                  type='tel'
                  className='h-12 rounded-xl border-[#A3E635]/55 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-[#A3E635]'
                />
                <Textarea
                  placeholder='How We can Help?'
                  className='min-h-40 rounded-xl border-[#A3E635]/55 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-[#A3E635]'
                />
                <motion.div
                  animate={reduceMotion ? undefined : { scale: [1, 1.02, 1] }}
                  transition={{
                    duration: 3.3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <Button className='h-12 w-full rounded-full bg-[#8AB83E] text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#99C847] hover:shadow-[0_0_26px_rgba(0,245,212,0.3)]'>
                    Send a Message
                  </Button>
                </motion.div>
              </form>
            </GlowingCard>
          </SectionReveal>
        </div>
      </section>
    </SiteShell>
  )
}

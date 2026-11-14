'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LoaderCircle, Plus, Save, WandSparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { generateVehicleSlug } from '@/lib/admin/vehicle-workflow'
import { vehicleAdminSchema } from '@/lib/validation/admin'

type FormInput = z.input<typeof vehicleAdminSchema>
type FormValues = z.output<typeof vehicleAdminSchema>
type Option = { id: string; name: string }
type FeatureOption = Option & { category: string }

const emptyVehicle: FormInput = { brandId: '', bodyTypeId: '', model: '', variant: '', stockNumber: '', slug: '', shortTitle: '', year: new Date().getFullYear(), price: 0, currency: 'INR', mileage: 0, fuelType: 'Diesel', transmission: 'Automatic', shortDescription: '', description: '', status: 'DRAFT', featured: false, newArrival: false, certified: false, featureIds: [], version: 1 }

export function VehicleForm({ vehicle, brands, bodyTypes, features, procurement, initialValues }: { vehicle?: Partial<FormInput> & { id: string }; brands: Option[]; bodyTypes: Option[]; features: FeatureOption[]; procurement?: { id: string; version: number }; initialValues?: Partial<FormInput> }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [brandOptions, setBrandOptions] = useState(brands)
  const [addingBrand, setAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [brandBusy, setBrandBusy] = useState(false)
  const [brandMessage, setBrandMessage] = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(vehicleAdminSchema), defaultValues: { ...emptyVehicle, ...initialValues, ...vehicle } })
  const brandId = watch('brandId'); const year = watch('year'); const model = watch('model'); const variant = watch('variant')
  function createSlug() { const brand = brandOptions.find((item) => item.id === brandId)?.name ?? ''; setValue('slug', generateVehicleSlug({ year: Number(year), brand, model, variant }), { shouldValidate: true }) }
  async function addBrand() {
    const name = newBrandName.trim().replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 100) { setBrandMessage('Enter a brand name between 2 and 100 characters.'); return }
    const existing = brandOptions.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    if (existing) { setValue('brandId', existing.id, { shouldValidate: true }); setAddingBrand(false); setBrandMessage('Existing brand selected.'); return }
    setBrandBusy(true); setBrandMessage('')
    try {
      const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (slug.length < 2) { setBrandMessage('Please enter a valid brand name.'); return }
      const response = await fetch('/api/admin/catalog/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug, description: '', logoUrl: '/images/brand-logos/default.svg', logoAlt: name + ' logo', country: 'Unknown', active: true, featured: false, displayOrder: 0 }) })
      const payload = await response.json()
      if (!response.ok) { setBrandMessage(response.status === 403 ? 'Your role needs brand management permission. Ask an administrator to add this brand.' : (payload.error?.message ?? 'Could not add brand. It may already exist.')); return }
      const added = { id: payload.data.id as string, name: payload.data.name as string }
      setBrandOptions((current) => [...current, added].sort((a, b) => a.name.localeCompare(b.name)))
      setValue('brandId', added.id, { shouldValidate: true, shouldDirty: true })
      setNewBrandName(''); setAddingBrand(false); setBrandMessage('Brand created and selected.')
      router.refresh()
    } catch { setBrandMessage('Could not connect to the brand service. Please try again.') }
    finally { setBrandBusy(false) }
  }
  async function submit(values: FormValues) {
    setMessage(''); setIsError(false)
    const converting = !vehicle && Boolean(procurement)
    const endpoint = vehicle ? `/api/admin/vehicles/${vehicle.id}` :
      converting ? `/api/admin/procurement/${procurement!.id}/convert` : '/api/admin/vehicles'
    const body = converting ? { vehicle: values, version: procurement!.version } : values
    try {
      const response = await fetch(endpoint, {
        method: vehicle ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setIsError(true)
        setMessage(payload?.error?.message ?? 'Vehicle could not be saved.')
        return
      }
      setMessage(payload?.message ?? 'Vehicle saved.')
      router.push(`/admin/vehicles/${payload.data.id}`)
      router.refresh()
    } catch {
      setIsError(true)
      setMessage('Vehicle service is unavailable. Please try again.')
    }
  }
  const error = (key: keyof FormInput) => errors[key]?.message ? <small style={{ color: '#f29a93' }}>{String(errors[key]?.message)}</small> : null
  return <form className="admin-form" onSubmit={handleSubmit(submit)}>
    {procurement && !vehicle ? <p className="admin-form-message" role="status">
      Creating an unpublished draft from a completed procurement intake. Enter vehicle specifications accurately; private seller data and attachments are never copied into public inventory.
    </p> : null}
    <section className="admin-form-section"><header><h2>1. Basic Information</h2><p>Identity, classification and operational state.</p></header><div className="admin-form-grid">
      <div><label>Brand<select {...register('brandId')}><option value="">Choose brand</option>{brandOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{error('brandId')}</label><button className="admin-button admin-button--secondary" type="button" onClick={() => { setAddingBrand((value) => !value); setBrandMessage('') }}><Plus />Add custom brand</button>{addingBrand ? <div><label>New brand name<input value={newBrandName} onChange={(event) => setNewBrandName(event.target.value)} maxLength={100} placeholder="e.g. Ford" /></label><button className="admin-button" type="button" onClick={addBrand} disabled={brandBusy}>{brandBusy ? <LoaderCircle /> : <Plus />}{brandBusy ? 'Saving...' : 'Save & select brand'}</button></div> : null}{brandMessage ? <p className="admin-form-message" role="status">{brandMessage}</p> : null}</div>
      <label>Model<input {...register('model')} />{error('model')}</label><label>Variant<input {...register('variant')} />{error('variant')}</label>
      <label>Stock number<input {...register('stockNumber')} />{error('stockNumber')}</label><label>Year<input type="number" {...register('year', { valueAsNumber: true })} />{error('year')}</label>
      <label>Body type<select {...register('bodyTypeId')}><option value="">Choose body type</option>{bodyTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{error('bodyTypeId')}</label>
      <label className="span-2">Public slug<input {...register('slug')} />{error('slug')}</label><button className="admin-button admin-button--secondary" type="button" onClick={createSlug}><WandSparkles />Generate slug</button>
      <label className="span-2">Short title<input {...register('shortTitle')} />{error('shortTitle')}</label><label>Status<select {...register('status')}><option>DRAFT</option><option>AVAILABLE</option><option>RESERVED</option><option>SOLD</option><option>ARCHIVED</option></select></label>
    </div></section>
    <section className="admin-form-section"><header><h2>2. Pricing</h2><p>Store money as integer INR values.</p></header><div className="admin-form-grid"><label>Sale price<input type="number" {...register('price', { valueAsNumber: true })} />{error('price')}</label><label>Original price<input type="number" {...register('originalPrice', { setValueAs: (value) => value === '' ? undefined : Number(value) })} />{error('originalPrice')}</label><label>Currency<input {...register('currency')} /></label></div></section>
    <section className="admin-form-section"><header><h2>3. Vehicle Specifications</h2><p>Public technical and condition data.</p></header><div className="admin-form-grid">
      <label>Mileage<input type="number" {...register('mileage', { valueAsNumber: true })} /></label><label>Fuel type<input {...register('fuelType')} /></label><label>Transmission<input {...register('transmission')} /></label>
      <label>Exterior colour<input {...register('exteriorColor')} /></label><label>Interior colour<input {...register('interiorColor')} /></label><label>Engine<input {...register('engineDescription')} /></label>
      <label>Power<input {...register('power')} /></label><label>Torque<input {...register('torque')} /></label><label>Drivetrain<input {...register('drivetrain')} /></label>
      <label>Seats<input type="number" {...register('seatingCapacity', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label><label>Doors<input type="number" {...register('doors', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label>
    </div></section>
    <section className="admin-form-section"><header><h2>4. Registration and Ownership</h2><p>Use masked registration data only.</p></header><div className="admin-form-grid"><label>Registration year<input type="number" {...register('registrationYear', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label><label>State<input {...register('registrationState')} /></label><label>Masked registration<input {...register('registrationNumberMasked')} /></label><label>Ownership count<input type="number" {...register('ownershipCount', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label><label>Service history<input {...register('serviceHistory')} /></label><label>Keys available<input type="number" {...register('keysAvailable', { setValueAs: (value) => value === '' ? undefined : Number(value) })} /></label></div></section>
    <section className="admin-form-section"><header><h2>5. Description</h2><p>Structured public copy without raw HTML.</p></header><div className="admin-form-grid"><label className="span-3">Short description<textarea {...register('shortDescription')} />{error('shortDescription')}</label><label className="span-3">Full description<textarea {...register('description')} />{error('description')}</label></div></section>
    <section className="admin-form-section"><header><h2>6. Features</h2><p>Select reusable, active vehicle features.</p></header><div className="admin-form-grid">{features.map((feature) => <label className="admin-checkbox" key={feature.id}><input type="checkbox" value={feature.id} {...register('featureIds')} /><span>{feature.name}<small>{feature.category}</small></span></label>)}</div></section>
    <section className="admin-form-section"><header><h2>7. Publication Flags</h2><p>Publishing is a separate permission-protected action after image review.</p></header><div className="admin-form-grid"><label className="admin-checkbox"><input type="checkbox" {...register('featured')} /><span>Featured vehicle</span></label><label className="admin-checkbox"><input type="checkbox" {...register('newArrival')} /><span>New arrival</span></label><label className="admin-checkbox"><input type="checkbox" {...register('certified')} /><span>Certified</span></label></div></section>
    {message ? <p className={`admin-form-message${isError ? ' is-error' : ''}`} role="status">{message}</p> : null}
    <footer className="admin-form-footer"><button className="admin-button admin-button--secondary" type="button" onClick={() => router.back()}>Cancel</button><button className="admin-button" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle /> : <Save />}{vehicle ? 'Save changes' : procurement ? 'Create procurement draft' : 'Create draft'}<ArrowRight /></button></footer>
  </form>
}

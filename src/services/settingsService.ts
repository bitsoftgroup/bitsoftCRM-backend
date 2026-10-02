import { prisma } from '../prisma.js'
import type { ContractInfoInput, DiscountsInput, HolidaysInput, RoomsInput } from '../validation/schemas.js'

/** Returns the center's settings row, creating it with defaults on first access. */
export async function getSettings(educationCenterId: string) {
  const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: educationCenterId } })
  const response=await prisma.settings.upsert({
    where: { educationCenterId },
    create: {
      educationCenterId,
      discounts: { 2: 10, 3: 15, 4: 20 },
      holidays: [],
      rooms: [],
      contractInfo: {
        centerName: center.name,
        directorName: '',
        address: '',
        phone: center.contactPhone ?? '',
        graceDays: 5,
        logoUrl: center.logoUrl
      },
      cashOpeningBalance: 0,
    },
    update: {},
  })
  console.log("Response", response)
  return response
}

export async function getDiscounts(educationCenterId: string) {
  return (await getSettings(educationCenterId)).discounts
}

export async function updateDiscounts(educationCenterId: string, discounts: DiscountsInput) {
  await getSettings(educationCenterId)
  const settings = await prisma.settings.update({ where: { educationCenterId }, data: { discounts } })
  return settings.discounts
}

export async function getHolidays(educationCenterId: string) {
  return (await getSettings(educationCenterId)).holidays
}

export async function updateHolidays(educationCenterId: string, holidays: HolidaysInput) {
  await getSettings(educationCenterId)
  const settings = await prisma.settings.update({ where: { educationCenterId }, data: { holidays } })
  return settings.holidays
}

export async function getRooms(educationCenterId: string) {
  return (await getSettings(educationCenterId)).rooms
}

export async function updateRooms(educationCenterId: string, rooms: RoomsInput) {
  await getSettings(educationCenterId)
  const settings = await prisma.settings.update({ where: { educationCenterId }, data: { rooms } })
  return settings.rooms
}

export async function getContractInfo(educationCenterId: string) {
  return (await getSettings(educationCenterId)).contractInfo
}

export async function updateContractInfo(educationCenterId: string, contractInfo: ContractInfoInput) {
  await getSettings(educationCenterId)
  const settings = await prisma.settings.update({ where: { educationCenterId }, data: { contractInfo } })
  return settings.contractInfo
}

export async function getCashOpeningBalance(educationCenterId: string) {
  return { amount: Number((await getSettings(educationCenterId)).cashOpeningBalance) }
}

export async function updateCashOpeningBalance(educationCenterId: string, amount: number) {
  await getSettings(educationCenterId)
  const settings = await prisma.settings.update({
    where: { educationCenterId },
    data: { cashOpeningBalance: amount },
  })
  return { amount: Number(settings.cashOpeningBalance) }
}

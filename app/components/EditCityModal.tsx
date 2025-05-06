"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import CityAutocomplete from "./CityAutocomplete"

interface SelectedCityData {
  name: string
  fullName: string
  placeId: string
}

interface EditCityModalProps {
  isOpen: boolean
  currentCity: string
  onClose: () => void
  onSave: (newCityData: { name: string; placeId?: string }) => void
  placeholder?: string
  currentLocationForBias?: { lat: number; lng: number }
}

export default function EditCityModal({
  isOpen,
  currentCity,
  onClose,
  onSave,
  placeholder = "Enter or search city name",
  currentLocationForBias,
}: EditCityModalProps) {
  const [selectedCity, setSelectedCity] = useState<SelectedCityData | null>(
    null
  )
  const [inputValue, setInputValue] = useState(currentCity)
  const [isCitySelectedFromList, setIsCitySelectedFromList] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setInputValue(currentCity)
      setSelectedCity(null)
      setIsCitySelectedFromList(false)
    } else {
      setInputValue("")
      setSelectedCity(null)
      setIsCitySelectedFromList(false)
    }
  }, [currentCity, isOpen])

  const handleCitySelectFromAutocomplete = (
    citySelection: SelectedCityData | null
  ) => {
    setSelectedCity(citySelection)
    if (citySelection) {
      setInputValue(citySelection.name)
      setIsCitySelectedFromList(true)
    } else {
      setIsCitySelectedFromList(false)
    }
  }

  const handleSave = () => {
    if (isCitySelectedFromList && selectedCity && selectedCity.name.trim()) {
      onSave({ name: selectedCity.name.trim(), placeId: selectedCity.placeId })
    } else if (inputValue.trim()) {
      onSave({ name: inputValue.trim() })
    } else {
      onSave({ name: currentCity })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit City Name</DialogTitle>
          <DialogDescription>Search for a new city or town.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <CityAutocomplete
            initialValue={inputValue}
            onCitySelect={handleCitySelectFromAutocomplete}
            placeholder={placeholder}
            currentLocationForBias={currentLocationForBias}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!inputValue.trim() && !currentCity}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

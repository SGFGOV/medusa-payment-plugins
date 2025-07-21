import { RadioGroup } from "@headlessui/react"
import { clx, Text } from "@medusajs/ui"
import Radio from "@modules/common/components/radio"
import { useEffect, useState } from "react"

const fetchMolliePaymentOptions = async () =>
  fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/mollie/payment-methods`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
    }
  ).then((res) => res.json())

type PaymentOption = {
  description: string
  id: string
  image: {
    svg: string
  }
}

const providerId = "pp_mollie_mollie"
export const MolliePaymentOptions = (props: {
  selectedOptionId: string
  setSelectedOptionId: (value: string) => void
}) => {
  const { selectedOptionId, setSelectedOptionId } = props
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])

  useEffect(() => {
    fetchMolliePaymentOptions()
      .then((methods) => {
        setPaymentOptions(methods)
      })
      .catch(console.log)
  }, [])

  return (
    <div>
      <RadioGroup
        value={selectedOptionId}
        onChange={(value: string) => setSelectedOptionId(value)}
      >
        {paymentOptions.map(({ description, id, image }) => (
          <RadioGroup.Option
            value={`pp_mollie_mollie_${id}`}
            key={id}
            className={clx(
              "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
              {
                "border-ui-border-interactive": selectedOptionId?.endsWith(id),
              }
            )}
          >
            <div className="flex items-center justify-between ">
              <div className="flex items-center gap-x-4">
                <Radio checked={selectedOptionId?.endsWith(id)} />
                <Text className="text-base-regular">{description}</Text>
              </div>
              <span className="justify-self-end text-ui-fg-base">
                <picture>
                  <img src={image.svg} alt={description} />
                </picture>
              </span>
            </div>
          </RadioGroup.Option>
        ))}
      </RadioGroup>
    </div>
  )
}
